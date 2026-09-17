package security

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

const TokenSize = 32

var ErrInvalidToken = errors.New("invalid authentication token")

func GenerateToken() (string, error) {
	data := make([]byte, TokenSize)

	if _, err := rand.Read(data); err != nil {
		return "", err
	}

	return hex.EncodeToString(data), nil
}

func LoadOrCreateToken(path string) (string, error) {
	if path == "" {
		return "", errors.New("token path is empty")
	}

	data, err := os.ReadFile(path)

	if err == nil {
		token := strings.TrimSpace(string(data))

		if len(token) == TokenSize*2 {
			return token, nil
		}

		return "", ErrInvalidToken
	}

	if !errors.Is(err, os.ErrNotExist) {
		return "", err
	}

	token, err := GenerateToken()
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return "", err
	}

	if err := os.WriteFile(path, []byte(token+"\n"), 0o600); err != nil {
		return "", err
	}

	return token, nil
}

func ValidateToken(expected, provided string) bool {
	if expected == "" || provided == "" {
		return false
	}

	if len(expected) != len(provided) {
		return false
	}

	var diff byte

	for index := range expected {
		diff |= expected[index] ^ provided[index]
	}

	return diff == 0
}
