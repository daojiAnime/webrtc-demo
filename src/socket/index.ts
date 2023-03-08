/*
 * @Author: Daoji
 * @Date: 2023-03-02 09:21:54
 * @LastEditors: Daoji
 * @LastEditTime: 2023-03-02 12:10:01
 * @FilePath: \webrtc-chatroom-demo\src\socket\index.ts
 */
// 导入事件中心
import type { Callback } from "./eventCenter";
import { EventCenter } from "./eventCenter";

type MessageType = {
  type: string,
  data: string
}

class WS {
  // 要连接的URL
  url: string
  // 一个协议字符串或一个协议字符串数组。
  // 这些字符串用来指定子协议，这样一个服务器就可以实现多个WebSocket子协议
  protocols?: string | Array<string>
  // WebSocket 实例
  ws: WebSocket | null = null
  // 是否在重连中
  isReconnectionLoading: boolean = false
  // 延时重连的 id
  timeId: NodeJS.Timeout | null = null
  // 是否是用户手动关闭连接
  isCustomClose: boolean = false
  // 错误消息队列
  errorStack: Array<any> = []
  // 消息管理中心
  eventCenter = new EventCenter()

  /**
   * @description: 构造函数,url创建ws对象
   * @param {string} url
   * @param {string} protocols
   * @return {*}
   */
  constructor(url: string, protocols?: string | Array<string>) {
    this.url = url
    this.protocols = protocols
    this.createWs()
  }

  createWs() {
    if ('WebSocket' in window) {
      // 实例化
      this.ws = new WebSocket(this.url, this.protocols)
      // 监听事件
      this.onopen()
      this.onerror()
      this.onclose()
      this.onmessage()
    } else {
      alert('你的浏览器不支持 WebSocket')
    }
  }

  // 监听成功
  onopen() {
    this.ws!.onopen = () => {
      console.log(this.ws, 'onopen')
      // 发送成功连接之前所发送失败的消息
      this.errorStack.forEach(message => {
        this.send(message)
      })
      this.errorStack = []
      this.isReconnectionLoading = false
    }
  }

  // 监听错误
  onerror() {
    this.ws!.onerror = (err) => {
      console.log(err, 'onerror')
      this.reconnection()
      this.isReconnectionLoading = false
    }
  }

  // 监听关闭
  onclose() {
    this.ws!.onclose = () => {
      console.log('onclose')

      // 用户手动关闭的不重连
      if (this.isCustomClose) return

      this.reconnection()
      this.isReconnectionLoading = false
    }
  }

  // 接收 WebSocket 消息
  async onmessage() {
    this.ws!.onmessage = (event: MessageType) => {
      try {
        const data = JSON.parse(event.data)
        this.eventCenter.emit(data.type, data.data)
      } catch (error) {
        console.log(error, 'error')
      }
    }
  }

  // 重连
  reconnection() {
    // 防止重复
    if (this.isReconnectionLoading) return

    this.isReconnectionLoading = true
    if (this.timeId) {
      clearTimeout(this.timeId)
    }
    this.timeId = setTimeout(() => {
      this.createWs()
    }, 3000)
  }

  // 发送消息
  send(message: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // 连接失败时的处理
    if (this.ws!.readyState !== 1) {
      this.errorStack.push(message)
      return
    }

    this.ws!.send(message)
  }

  // 手动关闭
  close() {
    this.isCustomClose = true
    this.ws!.close()
  }

  // 手动开启
  start() {
    this.isCustomClose = false
    this.reconnection()
  }

  // 订阅
  subscribe(eventName: string, cb: Callback) {
    this.eventCenter.on(eventName, cb)
  }

  // 取消订阅
  unsubscribe(eventName: string, cb: Callback) {
    this.eventCenter.off(eventName, cb)
  }

  // 销毁
  destroy() {
    this.close()
    this.ws = null
    this.errorStack = []
  }
}


export { WS };