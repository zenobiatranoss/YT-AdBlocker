package security

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
)

var ErrIntegrityMismatch = errors.New("integrity check failed")

func SHA256(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func FileSHA256(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()

	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

func VerifySHA256(data []byte, expected string) error {
	actual := SHA256(data)

	if !equalDigest(actual, expected) {
		return ErrIntegrityMismatch
	}

	return nil
}

func VerifyFileSHA256(path, expected string) error {
	actual, err := FileSHA256(path)
	if err != nil {
		return err
	}

	if !equalDigest(actual, expected) {
		return ErrIntegrityMismatch
	}

	return nil
}

func equalDigest(actual, expected string) bool {
	if len(actual) != len(expected) {
		return false
	}

	var diff byte

	for index := range actual {
		diff |= actual[index] ^ expected[index]
	}

	return diff == 0
}
