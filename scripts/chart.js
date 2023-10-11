class ResourceChart extends HTMLElement {
	constructor () {
		super();
		this.attachShadow({ mode: "open" });
		this.shadowRoot.innerHTML = `
            <style>
				* {
					box-sizing: border-box;
					font-family: monospace;
				}
				figure {
					margin: 0;
				}
                div {
					max-width: 400px;
					aspect-ratio: 1 / 1;
                }
				figcaption {
					text-align: center;
					margin-top: 10px;
					display: flex;
					flex-direction: column;
				}
            </style>
			<style id="responsive-style" media="not all">
				figure {
					display: flex;
					align-items: center;
					flex-direction: row;
					flex-wrap: nowrap;
					justify-content: flex-start;
				}
				div {
					max-height: 1lh;
				}
				figcaption {
					margin: 0;
					margin-left: 10px;
					display: flex;
					flex-direction: row;
					gap: 1ch;
					font-size: small;
				}
			</style>
			<figure>
				<div>
					<canvas></canvas>
				</div>
				<figcaption></figcaption>
			</figure>
        `;
		this.responsiveStyle = this.shadowRoot.querySelector("#responsive-style");
		this.canvas = this.shadowRoot.querySelector("canvas");
		this.caption = this.shadowRoot.querySelector("figcaption");
	}

	set data (data) {
		for (const line of data.title) {
			this.caption.innerHTML += `<span>${line}</span>`;
		}

		this.canvas.role = "img";
		this.canvas.ariaLabel = data.ariaLabel;

		const chartData = {
			type: "pie",
			data: data.data,
			options: {
				plugins: {
					title: {
						display: false
					},
					legend: {
						display: false
					},
					tooltip: {
						enabled: true
					}
				},
				interaction: {
					mode: "nearest"
				},
				onHover: function (e, activeElements) {
					if (window.innerWidth <= data.breakpoint) {
						updateTooltipShow(e.chart, false);
					}
					else {
						updateTooltipShow(e.chart, true);
					}
				}
			}
		};

		this.chart = createChart(this.canvas, chartData);

		if (data.breakpoint) {
			this.responsiveStyle.media = `screen and (width <= ${data.breakpoint}px)`;
		}
		else {
			this.responsiveStyle.media = "not all";
		}
	}

	get data () {
		return null;
	}
}

function createChart (ctx, data) {
	return new window.Chart(ctx, data);
}

// this is a really bad way to do this, but chartjs api does not expose many ways to dynamically set hover and tooltip options
function updateTooltipShow (chart, enabled) {
	chart.options.plugins.tooltip.enabled = enabled;
	chart.options.interaction.mode = enabled ? "nearest" : null;
	chart.update();
}

customElements.define("resource-chart", ResourceChart);
