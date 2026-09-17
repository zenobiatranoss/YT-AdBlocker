package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"yt-adblocker/engine/internal/security"
)

const engineURL = "http://127.0.0.1:8766"

type Message struct {
	Type   string          `json:"type"`
	ID     string          `json:"id,omitempty"`
	Method string          `json:"method,omitempty"`
	Path   string          `json:"path,omitempty"`
	Body   json.RawMessage `json:"body,omitempty"`
}

type Response struct {
	ID     string `json:"id,omitempty"`
	OK     bool   `json:"ok"`
	Status int    `json:"status,omitempty"`
	Data   any    `json:"data,omitempty"`
	Error  string `json:"error,omitempty"`
}

type Host struct {
	token  string
	client *http.Client
	writer *bufio.Writer
}

func main() {
	tokenPath := os.Getenv("YT_ADBLOCKER_TOKEN")

	if tokenPath == "" {
		tokenPath = security.TokenPath()
	}

	token, err := security.LoadOrCreateToken(tokenPath)
	if err != nil {
		fatal(err)
	}

	if len(token) != security.TokenSize*2 {
		fatal(errors.New("invalid authentication token"))
	}

	client := &http.Client{
		Timeout: 2 * time.Second,
	}

	if err := ensureEngine(client, token, tokenPath); err != nil {
		fatal(err)
	}

	host := &Host{
		token: token,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		writer: bufio.NewWriter(os.Stdout),
	}

	reader := bufio.NewReader(os.Stdin)

	for {
		message, err := readMessage(reader)

		if errors.Is(err, io.EOF) {
			return
		}

		if err != nil {
			_ = host.write(Response{
				OK:    false,
				Error: err.Error(),
			})
			return
		}

		response := host.handle(message)

		if err := host.write(response); err != nil {
			return
		}
	}
}

func ensureEngine(client *http.Client, token, tokenPath string) error {
	if engineHealthy(client, token) {
		return nil
	}

	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to resolve native host path: %w", err)
	}

	enginePath := filepath.Join(
		filepath.Dir(executable),
		"yt-adblocker",
	)

	executableDir := filepath.Dir(executable)
	rulesCandidates := []string{
		filepath.Join(executableDir, "rules", "youtube", "ads.rules"),
		filepath.Join(filepath.Dir(executableDir), "rules", "youtube", "ads.rules"),
		filepath.Join(filepath.Dir(filepath.Dir(executableDir)), "rules", "youtube", "ads.rules"),
	}

	rulesPath := ""
	for _, candidate := range rulesCandidates {
		if _, err := os.Stat(candidate); err == nil {
			rulesPath = candidate
			break
		}
	}

	if rulesPath == "" {
		return errors.New("unable to locate youtube rules")
	}

	if _, err := os.Stat(enginePath); err != nil {
		return fmt.Errorf("go engine not found: %w", err)
	}

	if _, err := os.Stat(rulesPath); err != nil {
		return fmt.Errorf("rules file not found: %w", err)
	}

	cmd := exec.Command(enginePath)

	cmd.Dir = filepath.Dir(enginePath)
	cmd.Stdin = nil
	cmd.Stdout = nil
	cmd.Stderr = nil

	cmd.Env = append(
		os.Environ(),
		"YT_ADBLOCKER_RULES="+rulesPath,
		"YT_ADBLOCKER_STATE="+security.StatePath(),
		"YT_ADBLOCKER_TOKEN="+tokenPath,
	)

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start go engine: %w", err)
	}

	for attempt := 0; attempt < 50; attempt++ {
		if engineHealthy(client, token) {
			return nil
		}

		time.Sleep(100 * time.Millisecond)
	}

	return errors.New("go engine did not become ready")
}

func engineHealthy(client *http.Client, token string) bool {
	request, err := http.NewRequest(
		http.MethodGet,
		engineURL+"/api/v1/status",
		nil,
	)
	if err != nil {
		return false
	}

	request.Header.Set("Authorization", "Bearer "+token)

	response, err := client.Do(request)
	if err != nil {
		return false
	}

	defer response.Body.Close()

	return response.StatusCode == http.StatusOK
}

func (h *Host) handle(message Message) Response {
	if message.ID == "" {
		return Response{
			OK:    false,
			Error: "missing message id",
		}
	}

	switch message.Type {
	case "status":
		return h.request(message.ID, http.MethodGet, "/api/v1/status", nil)

	case "stats":
		return h.request(message.ID, http.MethodGet, "/api/v1/stats", nil)

	case "rules":
		return h.request(message.ID, http.MethodGet, "/api/v1/rules", nil)

	case "filter":
		return h.request(message.ID, http.MethodPost, "/api/v1/filter", message.Body)

	case "detection":
		return h.request(message.ID, http.MethodPost, "/api/v1/events/detection", message.Body)

	case "interruption-prevented":
		return h.request(message.ID, http.MethodPost, "/api/v1/events/interruption", nil)

	case "playback-recovery":
		return h.request(message.ID, http.MethodPost, "/api/v1/events/recovery", nil)

	default:
		return Response{
			ID:    message.ID,
			OK:    false,
			Error: "unsupported message type",
		}
	}
}

func (h *Host) request(id, method, path string, body []byte) Response {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var reader io.Reader

	if len(body) > 0 {
		reader = bytes.NewReader(body)
	}

	request, err := http.NewRequestWithContext(
		ctx,
		method,
		engineURL+path,
		reader,
	)

	if err != nil {
		return Response{
			ID:    id,
			OK:    false,
			Error: err.Error(),
		}
	}

	request.Header.Set("Authorization", "Bearer "+h.token)

	if len(body) > 0 {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := h.client.Do(request)

	if err != nil {
		return Response{
			ID:    id,
			OK:    false,
			Error: fmt.Sprintf("engine unavailable: %v", err),
		}
	}

	defer response.Body.Close()

	data, err := io.ReadAll(io.LimitReader(response.Body, 4*1024*1024))

	if err != nil {
		return Response{
			ID:    id,
			OK:    false,
			Error: err.Error(),
		}
	}

	var decoded any

	if len(data) > 0 {
		if err := json.Unmarshal(data, &decoded); err != nil {
			return Response{
				ID:     id,
				OK:     false,
				Status: response.StatusCode,
				Error:  "invalid engine response",
			}
		}
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return Response{
			ID:     id,
			OK:     false,
			Status: response.StatusCode,
			Data:   decoded,
			Error:  "engine request failed",
		}
	}

	return Response{
		ID:     id,
		OK:     true,
		Status: response.StatusCode,
		Data:   decoded,
	}
}

func readMessage(reader *bufio.Reader) (Message, error) {
	var length uint32

	if err := binary.Read(reader, binary.LittleEndian, &length); err != nil {
		return Message{}, err
	}

	if length == 0 || length > 16*1024*1024 {
		return Message{}, errors.New("invalid native message size")
	}

	data := make([]byte, length)

	if _, err := io.ReadFull(reader, data); err != nil {
		return Message{}, err
	}

	var message Message

	if err := json.Unmarshal(data, &message); err != nil {
		return Message{}, err
	}

	return message, nil
}

func (h *Host) write(response Response) error {
	data, err := json.Marshal(response)

	if err != nil {
		return err
	}

	if len(data) > 16*1024*1024 {
		return errors.New("native response too large")
	}

	var length [4]byte
	binary.LittleEndian.PutUint32(length[:], uint32(len(data)))

	if _, err := h.writer.Write(length[:]); err != nil {
		return err
	}

	if _, err := h.writer.Write(data); err != nil {
		return err
	}

	return h.writer.Flush()
}

func fatal(err error) {
	_, _ = fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
