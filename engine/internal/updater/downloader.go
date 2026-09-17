package updater

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

var (
	ErrDownloadFailed = errors.New("update download failed")
	ErrDownloadTooBig = errors.New("update exceeds maximum size")
)

const DefaultMaxDownloadSize int64 = 64 * 1024 * 1024

type Downloader struct {
	Client    *http.Client
	MaxSize   int64
	UserAgent string
}

func NewDownloader() *Downloader {
	return &Downloader{
		Client: &http.Client{
			Timeout: 60 * time.Second,
		},
		MaxSize:   DefaultMaxDownloadSize,
		UserAgent: "YT-AdBlocker-Updater/0.1",
	}
}

func (d *Downloader) Download(ctx context.Context, target string) ([]byte, error) {
	if d == nil {
		return nil, ErrDownloadFailed
	}

	client := d.Client

	if client == nil {
		client = &http.Client{Timeout: 60 * time.Second}
	}

	maxSize := d.MaxSize

	if maxSize <= 0 {
		maxSize = DefaultMaxDownloadSize
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}

	if d.UserAgent != "" {
		request.Header.Set("User-Agent", d.UserAgent)
	}

	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: HTTP %s", ErrDownloadFailed, response.Status)
	}

	if response.ContentLength > maxSize {
		return nil, ErrDownloadTooBig
	}

	reader := io.LimitReader(response.Body, maxSize+1)
	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}

	if int64(len(data)) > maxSize {
		return nil, ErrDownloadTooBig
	}

	return data, nil
}
