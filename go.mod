module proxmoxaas-dashboard

go 1.27.3

require (
	github.com/gerow/go-color v0.0.0-20140219113758-125d37f527f1
	github.com/go-viper/mapstructure/v2 v2.5.0
	github.com/tdewolff/minify/v2 v2.24.17
	proxmoxaas-common-lib v0.0.0
)

replace proxmoxaas-common-lib => ./proxmoxaas-common-lib

require github.com/tdewolff/parse/v2 v2.8.16 // indirect
