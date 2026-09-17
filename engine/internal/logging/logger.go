package logging

import (
	"io"
	"log"
	"os"
	"sync"
)

type Logger struct {
	mu     sync.Mutex
	logger *log.Logger
}

func New(out io.Writer) *Logger {
	if out == nil {
		out = os.Stderr
	}

	return &Logger{
		logger: log.New(out, "yt-adblocker ", log.LstdFlags|log.LUTC),
	}
}

func (l *Logger) Info(message string, args ...any) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.logger.Printf("INFO "+message, args...)
}

func (l *Logger) Warn(message string, args ...any) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.logger.Printf("WARN "+message, args...)
}

func (l *Logger) Error(message string, args ...any) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.logger.Printf("ERROR "+message, args...)
}
