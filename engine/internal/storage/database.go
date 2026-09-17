package storage

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

var ErrClosed = errors.New("storage is closed")

type Database struct {
	mu     sync.RWMutex
	path   string
	data   map[string]json.RawMessage
	closed bool
}

func Open(path string) (*Database, error) {
	database := &Database{
		path: path,
		data: make(map[string]json.RawMessage),
	}

	if err := database.load(); err != nil {
		return nil, err
	}

	return database, nil
}

func (d *Database) load() error {
	data, err := os.ReadFile(d.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}

	if len(data) == 0 {
		return nil
	}

	return json.Unmarshal(data, &d.data)
}

func (d *Database) Get(key string, target any) error {
	d.mu.RLock()
	defer d.mu.RUnlock()

	if d.closed {
		return ErrClosed
	}

	value, ok := d.data[key]
	if !ok {
		return os.ErrNotExist
	}

	return json.Unmarshal(value, target)
}

func (d *Database) Set(key string, value any) error {
	encoded, err := json.Marshal(value)
	if err != nil {
		return err
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	if d.closed {
		return ErrClosed
	}

	d.data[key] = encoded

	return d.flushLocked()
}

func (d *Database) Delete(key string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.closed {
		return ErrClosed
	}

	delete(d.data, key)

	return d.flushLocked()
}

func (d *Database) flushLocked() error {
	if err := os.MkdirAll(filepath.Dir(d.path), 0o700); err != nil {
		return err
	}

	data, err := json.MarshalIndent(d.data, "", "  ")
	if err != nil {
		return err
	}

	temp := d.path + ".tmp"

	if err := os.WriteFile(temp, data, 0o600); err != nil {
		return err
	}

	return os.Rename(temp, d.path)
}

func (d *Database) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	d.closed = true

	return nil
}
