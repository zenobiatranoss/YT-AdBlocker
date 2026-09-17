package server

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"

	"yt-adblocker/engine/internal/security"
)

type Event struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

type EventHub struct {
	mu         sync.RWMutex
	clients    map[*websocket.Conn]struct{}
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	events     chan Event
	done       chan struct{}
	closeOnce  sync.Once
}

func NewEventHub() *EventHub {
	hub := &EventHub{
		clients:    make(map[*websocket.Conn]struct{}),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		events:     make(chan Event, 32),
		done:       make(chan struct{}),
	}

	go hub.run()

	return hub
}

func (h *EventHub) run() {
	for {
		select {
		case conn := <-h.register:
			h.mu.Lock()
			h.clients[conn] = struct{}{}
			h.mu.Unlock()

		case conn := <-h.unregister:
			h.remove(conn)

		case event := <-h.events:
			h.broadcast(event)

		case <-h.done:
			return
		}
	}
}

func (h *EventHub) Publish(event Event) {
	select {
	case h.events <- event:
	default:
	}
}

func (h *EventHub) Add(conn *websocket.Conn) {
	select {
	case h.register <- conn:
	case <-h.done:
	}
}

func (h *EventHub) Remove(conn *websocket.Conn) {
	select {
	case h.unregister <- conn:
	case <-h.done:
	}
}

func (h *EventHub) remove(conn *websocket.Conn) {
	h.mu.Lock()
	delete(h.clients, conn)
	h.mu.Unlock()
	_ = conn.Close()
}

func (h *EventHub) broadcast(event Event) {
	payload, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	clients := make([]*websocket.Conn, 0, len(h.clients))

	for conn := range h.clients {
		clients = append(clients, conn)
	}

	h.mu.RUnlock()

	for _, conn := range clients {
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			h.Remove(conn)
		}
	}
}

func (h *EventHub) Close() {
	h.closeOnce.Do(func() {
		close(h.done)

		h.mu.Lock()
		defer h.mu.Unlock()

		for conn := range h.clients {
			_ = conn.Close()
		}

		h.clients = make(map[*websocket.Conn]struct{})
	})
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return security.IsAllowedOrigin(r.Header.Get("Origin"))
	},
}

func (s *Server) websocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	s.events.Add(conn)

	defer s.events.Remove(conn)

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}
