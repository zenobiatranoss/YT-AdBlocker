package updater

import (
	"crypto/ed25519"
	"errors"
	"strings"

	"yt-adblocker/engine/internal/security"
)

var ErrVerificationFailed = errors.New("update verification failed")

func Verify(data []byte, manifest Manifest, publicKey ed25519.PublicKey) error {
	if err := manifest.Validate(); err != nil {
		return err
	}

	if err := security.VerifySHA256(data, strings.ToLower(manifest.SHA256)); err != nil {
		return ErrVerificationFailed
	}

	if manifest.Signature == "" {
		return ErrVerificationFailed
	}

	if err := security.VerifySignature(
		manifest.CanonicalData(),
		manifest.Signature,
		publicKey,
	); err != nil {
		return ErrVerificationFailed
	}

	return nil
}
