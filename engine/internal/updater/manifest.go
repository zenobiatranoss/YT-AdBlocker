package updater

import (
	"encoding/json"
	"errors"
	"net/url"
	"strings"
)

var (
	ErrInvalidManifest = errors.New("invalid update manifest")
	ErrInvalidVersion  = errors.New("invalid update version")
	ErrInvalidURL      = errors.New("invalid update URL")
	ErrMissingChecksum = errors.New("missing update checksum")
)

type Manifest struct {
	Version   string `json:"version"`
	URL       string `json:"url"`
	SHA256    string `json:"sha256"`
	Signature string `json:"signature,omitempty"`
}

func ParseManifest(data []byte) (Manifest, error) {
	var manifest Manifest

	if err := json.Unmarshal(data, &manifest); err != nil {
		return Manifest{}, err
	}

	if err := manifest.Validate(); err != nil {
		return Manifest{}, err
	}

	return manifest, nil
}

func (m Manifest) Validate() error {
	if strings.TrimSpace(m.Version) == "" {
		return ErrInvalidVersion
	}

	if strings.ContainsAny(m.Version, " \t\r\n") {
		return ErrInvalidVersion
	}

	parsed, err := url.Parse(m.URL)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return ErrInvalidURL
	}

	if len(m.SHA256) != 64 {
		return ErrMissingChecksum
	}

	for _, character := range m.SHA256 {
		if !strings.ContainsRune("0123456789abcdefABCDEF", character) {
			return ErrMissingChecksum
		}
	}

	return nil
}

func (m Manifest) CanonicalData() []byte {
	return []byte(m.Version + "\n" + m.URL + "\n" + strings.ToLower(m.SHA256))
}
