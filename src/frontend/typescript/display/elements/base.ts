import $ = require("jquery");

export interface Entity {
  id(): string,
  neighbors(): IterableIterator<Entity>,
  remove(): void,
}

export class NodeButton {
  check: () => boolean;
  run: () => void;
  html: JQuery<HTMLElement>;

  constructor(check: () => boolean, run: () => void, css_class: string, text: string) {
    this.check = check;
    this.run = run;

    let html = $(`<div class='node-button ${css_class}'>${text}</div>`)
    html.on("click", this.run)
    this.html = html;
  }

  updateButtons() {
    if (this.check()) {
      this.html.removeClass("node-button-hidden");
    } else {
      this.html.addClass("node-button-hidden");
    }
  }
}
