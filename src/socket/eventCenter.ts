/*
 * @Author: Daoji
 * @Date: 2023-03-02 10:48:17
 * @LastEditors: Daoji
 * @LastEditTime: 2023-03-02 11:45:36
 * @FilePath: \webrtc-chatroom-demo\src\socket\eventCenter.ts
 * 事件管理中心（发布订阅者模式）
 */
type EventStack = {
  [key: string]: any
}
type Callback = (arg0: any) => void;


class EventCenter {
  // 通过事件类型作为属性来管理不通的事件回调
  eventStack: EventStack = {}

  constructor() {
    this.eventStack = {}
  }

  on(eventName: string, cb: any) {
    const { eventStack } = this
    const eventValue = eventStack[eventName]

    eventValue ? eventValue.push(cb) : eventStack[eventName] = [cb]
  }

  once(eventName: string, cb: any) {
    const { eventStack } = this
    const eventValue = eventStack[eventName]
    // 利用闭包的形式 来模拟一次性监听的功能函数
    const tempCb = () => {
      let isOutOfDate = false

      return () => {
        if (isOutOfDate) return
        cb()
        isOutOfDate = true
      }
    }

    eventValue ? eventValue.push(tempCb()) : eventStack[eventName] = [tempCb()]
  }

  off(eventName: string, cb: any) {
    const { eventStack } = this
    const eventValue = eventStack[eventName]

    if (!eventValue) return

    (eventValue || []).forEach((eventCb: any, index: number) => {
      if (eventCb === cb) {
        eventValue.splice(index, 1)
      }
    })
  }

  emit(eventName: string, data: any) {
    const { eventStack } = this
    const eventValue = eventStack[eventName]

    if (!eventValue) return

    (eventValue || []).forEach((eventCb: Callback): void => {
      eventCb(data)
    })
  }
}
export { EventCenter };
export type { Callback, EventStack };