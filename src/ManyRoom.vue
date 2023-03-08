<script setup lang="ts">
import { WS } from "./socket";
import type { InitMessageType, PeerItemType, ConnectMessageType } from "./types";
import { nextTick, type Ref } from "vue";
import { ref } from "vue";
let myself: Ref<HTMLVideoElement | null> = ref(null)
let videoGrid: Ref<HTMLElement | null> = ref(null)
let localStream: MediaStream | null = null
let PeerList: PeerItemType = {}
let UUID: string | null = null


function createMsg(type: string, data: ConnectMessageType): string {
  return JSON.stringify(
    {
      type: type,
      data: data,
    }
  )
}





function connectToNewUser(userId: string, stream: MediaStream) {
  let video = document.getElementById(userId) as HTMLVideoElement
  if (!video) {
    console.log('创建视频窗口');

    video = document.createElement('video')
    video.id = userId
    video.autoplay = true
    video.controls = true
    video.muted = true
    videoGrid.value!.append(video);
    video.addEventListener('loadedmetadata', () => {
      video.play()
    })
  }
  video.srcObject = stream;
  console.log('添加流至视频窗口');

}

function createRTCConnection(): RTCPeerConnection {
  const _pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: ['stun:stun.stunprotocol.org:3478']
      }
    ]
  })
  return _pc
}

function addLocalStreamToRTCConnection(peer: RTCPeerConnection) {
  localStream!.getTracks().forEach((track, index) => {
    if (localStream) {
      peer.addTrack(track, localStream)
      console.log('将本地视频流添加到RTC', track);
    }
  });
}

/**
 * @description: 在获取媒体流之后再创建连接
 * @return {*}
 */
function init_websocket() {
  const ws = new WS('ws://localhost:8765/ff')
  ws.subscribe('init', (d: string) => {

    const data: InitMessageType = JSON.parse(d);
    UUID = data.uuid;
    if (data.other) {
      console.log('成功加入房间');
    } else {
      console.log('成功创建房间');
    }
    PeerList = {}
    data.other.forEach((user_id: string) => {
      PeerList[user_id] = null
    });
    ws.send(JSON.stringify({
      type: 'init',
      data: UUID
    }))
  })

  ws.subscribe('joined', (d: string) => {
    const _d = JSON.parse(d);

    if (_d.user === UUID) {
      for (const user in PeerList) {
        if (Object.prototype.hasOwnProperty.call(PeerList, user)) {
          if (user === UUID) {
            continue
          }
          console.log('用户', user);

          const peer = createRTCConnection()
          addLocalStreamToRTCConnection(peer)

          peer.onicecandidate = e => {
            if (e.candidate) {
              ws.send(createMsg("send", {
                from: UUID!,
                to: user,
                event: 'ice',
                data: JSON.stringify(e.candidate)
              }))
            }
          }
          peer.ontrack = e => {
            // remote.value!.srcObject = e.streams[0];
            console.log('接收到流传输');

            connectToNewUser(user, e.streams[0]);
          }
          peer.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          })
            .then((sdp) => {
              peer.setLocalDescription(sdp);
              ws.send(createMsg('send', {
                event: "connect-req",
                to: user,
                from: UUID!,
                data: JSON.stringify(sdp),
              }))
            }).catch((err) => {
              console.log(err);
            });

          PeerList[user] = peer;
        }
      }
    }
  })

  ws.subscribe('connect-req', (d: ConnectMessageType) => {
    console.log('新用户加入', d.from);

    console.log('创建新连接');

    const peer = createRTCConnection()
    PeerList[d.from] = peer
    addLocalStreamToRTCConnection(peer)
    peer.onicecandidate = e => {
      if (e.candidate) {
        ws.send(createMsg("send", {
          from: UUID!,
          to: d.from,
          event: 'ice',
          data: JSON.stringify(e.candidate)
        }))
      }
    }
    peer.ontrack = e => {
      console.log('接收到流传输');
      connectToNewUser(d.from, e.streams[0]);
    }
    peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(d.data!)))
    peer.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    })
      .then((sdp) => {
        peer?.setLocalDescription(sdp);
        const msg = createMsg('send', {
          data: JSON.stringify(sdp),
          to: d.from,
          from: UUID!,
          event: 'connect-resp'
        })
        ws.send(msg)
      }).catch((err) => {
        console.log(err);
      });
  })


  ws.subscribe('connect-resp', (d: ConnectMessageType) => {

    PeerList[d.from]?.setRemoteDescription(new RTCSessionDescription(JSON.parse(d.data!)))
    console.log('设置Answer完成！');
  })

  ws.subscribe('ice', (d: ConnectMessageType) => {
    const candidate = JSON.parse(d.data!);
    PeerList[d.from]!.addIceCandidate(new RTCIceCandidate(candidate))
    console.log('接收ice', candidate);
  })

  ws.subscribe('left', (user: string) => {
    PeerList[user]?.close()
    Reflect.deleteProperty(PeerList, user)
    document.getElementById(user)?.remove()
  })
}

nextTick(() => {
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then(stream => {
    myself.value!.srcObject = stream;
    localStream = stream;
    init_websocket()
  })

})


</script>

<template>
  <main>
    <div id="video-grid" ref="videoGrid">
      <div class="myself">
        <video ref="myself" autoplay muted></video>
      </div>
      <!-- <video ref="remote" autoplay controls muted></video> -->
    </div>
    <div class="divider"></div>
  </main>
</template>

<style lang="scss" scoped>
#video-grid {
  @apply grid grid-cols-auto-300 auto-rows-[300px];
}

video {
  @apply w-full h-full object-cover;
}


.myself {
  width: 300px;
  background-color: pink;
  position: relative;
}

.myself::before {
  content: "本机";
  // display: flex;
  // flex-direction: row-reverse;
  position: absolute;
  width: 35px;
  top: 0;
  right: 0;
  font-size: 14px;
  // clear: both;
  z-index: 2;
  color: #fff;
}
</style>