package updater

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"time"
)

var (
	ErrUpdateTarget = errors.New("invalid update target")
	ErrBackupFailed = errors.New("failed to create update backup")
)

type Updater struct {
	Downloader *Downloader
}

func New() *Updater {
	return &Updater{
		Downloader: NewDownloader(),
	}
}

func (u *Updater) DownloadAndVerify(
	ctx context.Context,
	manifest Manifest,
	publicKey []byte,
) ([]byte, error) {
	if u == nil || u.Downloader == nil {
		return nil, ErrDownloadFailed
	}

	data, err := u.Downloader.Download(ctx, manifest.URL)
	if err != nil {
		return nil, err
	}

	if err := Verify(data, manifest, publicKey); err != nil {
		return nil, err
	}

	return data, nil
}

func Install(target string, data []byte) error {
	if target == "" {
		return ErrUpdateTarget
	}

	info, err := os.Stat(target)
	if err != nil {
		return err
	}

	if info.IsDir() {
		return ErrUpdateTarget
	}

	directory := filepath.Dir(target)

	if err := os.MkdirAll(directory, 0o700); err != nil {
		return err
	}

	backup := target + ".bak-" + time.Now().UTC().Format("20060102T150405.000000000Z")

	if err := copyFile(target, backup); err != nil {
		return ErrBackupFailed
	}

	temp := target + ".update"

	if err := os.WriteFile(temp, data, 0o700); err != nil {
		_ = os.Remove(temp)
		return err
	}

	if err := os.Chmod(temp, info.Mode().Perm()); err != nil {
		_ = os.Remove(temp)
		return err
	}

	if err := os.Rename(temp, target); err != nil {
		_ = os.Remove(temp)
		return err
	}

	return nil
}

func copyFile(source, target string) error {
	input, err := os.ReadFile(source)
	if err != nil {
		return err
	}

	return os.WriteFile(target, input, 0o600)
}
