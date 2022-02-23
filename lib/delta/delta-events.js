import {Delta} from './delta';

// TODO document
export class DeltaEvents {

  events;

  /**
   * @param events [[title: string, event: Object]]
   */
  constructor(events) {
    this.events = events;
  }

  async process(delta) {
    if (!(delta instanceof Delta)) {
      await this.process(new Delta(delta));
      return;
    }
    for(let [title, event] of this.events) {
      if (event.isMatch(delta)) {
        console.info(`DeltaEvent: Delta match for [${title}], processing ...`)
        await event.process(delta);
      }
    }
  }
}