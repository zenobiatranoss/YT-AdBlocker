package security

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
)

var (
	ErrInvalidPublicKey = errors.New("invalid public key")
	ErrInvalidSignature = errors.New("invalid signature")
)

func Sign(data []byte, privateKey ed25519.PrivateKey) (string, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return "", errors.New("invalid private key")
	}

	signature := ed25519.Sign(privateKey, data)
	return base64.RawStdEncoding.EncodeToString(signature), nil
}

func VerifySignature(data []byte, encodedSignature string, publicKey ed25519.PublicKey) error {
	if len(publicKey) != ed25519.PublicKeySize {
		return ErrInvalidPublicKey
	}

	signature, err := base64.RawStdEncoding.DecodeString(encodedSignature)
	if err != nil {
		return ErrInvalidSignature
	}

	if len(signature) != ed25519.SignatureSize {
		return ErrInvalidSignature
	}

	if !ed25519.Verify(publicKey, data, signature) {
		return ErrInvalidSignature
	}

	return nil
}
