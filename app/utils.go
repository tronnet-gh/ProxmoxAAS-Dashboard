package app

import (
	"encoding/json"
	"log"
	"os"
)

type Config struct {
	Port         int    `json:"listenPort"`
	Organization string `json:"organization"`
	PVE          string `json:"pveurl"`
	API          string `json:"apiurl"`
	Page         string
}

func GetConfig(configPath string) Config {
	content, err := os.ReadFile(configPath)
	if err != nil {
		log.Fatal("Error when opening config file: ", err)
	}
	var config Config
	err = json.Unmarshal(content, &config)
	if err != nil {
		log.Fatal("Error during parsing config file: ", err)
	}
	return config
}
