class CustomChart extends HTMLElement {
	constructor (data) {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
            <style>
                div {
					min-width: 200px;
					max-width: 400px;
					aspect-ratio: 1 / 1;
                }
            </style>
            <div>
                <canvas>
            </div>
        `;
        this.canvas = this.shadowRoot.querySelector("canvas");
	}

	set data (data) {
		this.canvas.role = "img";
		this.canvas.ariaLabel = data.ariaLabel;
		createChart(this.canvas, data.chart);
	}

	get data () {
		return null;
	}
}

function createChart (ctx, data) {
	return new Chart(ctx, data);
}

customElements.define("custom-chart", CustomChart);
