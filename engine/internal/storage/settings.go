package storage

type Settings struct {
	Enabled           bool `json:"enabled"`
	HidePageAds       bool `json:"hide_page_ads"`
	ProtectPlayback   bool `json:"protect_playback"`
	CollectStatistics bool `json:"collect_statistics"`
}

const settingsKey = "settings"

func DefaultSettings() Settings {
	return Settings{
		Enabled:           true,
		HidePageAds:       true,
		ProtectPlayback:   true,
		CollectStatistics: true,
	}
}

func LoadSettings(database *Database) (Settings, error) {
	var settings Settings

	err := database.Get(settingsKey, &settings)

	if err != nil {
		if err != ErrClosed {
			settings = DefaultSettings()

			if setErr := database.Set(settingsKey, settings); setErr != nil {
				return Settings{}, setErr
			}

			return settings, nil
		}

		return Settings{}, err
	}

	return settings, nil
}

func SaveSettings(database *Database, settings Settings) error {
	return database.Set(settingsKey, settings)
}
