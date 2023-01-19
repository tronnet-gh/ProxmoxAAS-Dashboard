export const pveconfig = {
	pveAPI: "https://pve.tronnet.net/api2/json",
	diskMetaData: {
		//actionBarOrder: ["config", "move", "reassign", "resize", "delete_detach_attach"],
		actionBarOrder: ["config", "move", "resize", "delete_detach_attach"], // handle reassign later
		lxc: {
			prefixOrder: ["rootfs", "mp", "unused"],
			rootfs: {name: "ROOTFS", icon: "images/resources/drive.svg", actions: ["move", "resize"]},
			mp: {name: "MP", icon: "images/resources/drive.svg", actions: ["config", "detach", "move", "reassign", "resize"]},
			unused: {name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"]}
		},
		qemu: {
			prefixOrder: ["ide", "sata", "unused"],
			ide: {name: "IDE", icon: "images/resources/disk.svg", actions: ["config", "delete"]},
			sata: {name: "SATA", icon: "images/resources/drive.svg", actions: ["detach", "move", "reassign", "resize"]},
			unused: {name: "UNUSED", icon: "images/resources/drive.svg", actions: ["attach", "delete", "reassign"]}
		}
	}
}