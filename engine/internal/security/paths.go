package security

import (
	"os"
	"path/filepath"
)

func DataDir() string {
	if home, err := os.UserHomeDir(); err == nil {
		return filepath.Join(home, ".local", "share", "yt-adblocker")
	}

	return filepath.Join(os.TempDir(), "yt-adblocker")
}

func TokenPath() string {
	return filepath.Join(DataDir(), "auth.token")
}

func StatePath() string {
	return filepath.Join(DataDir(), "state.json")
}
