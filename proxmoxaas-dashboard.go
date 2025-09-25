package main

import (
	"flag"
	app "proxmoxaas-dashboard/app"
)

func main() {
	configPath := flag.String("config", "config.json", "path to config.json file")
	flag.Parse()
	app.Run(configPath)
}
