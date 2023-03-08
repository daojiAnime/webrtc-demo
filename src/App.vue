<script setup lang="ts">
import { nextTick, type Ref } from "vue";
import { watch, ref } from "vue";
let myself: Ref<HTMLVideoElement | null> = ref(null)
let remote: Ref<HTMLVideoElement | null> = ref(null)
let videoGrid: Ref<HTMLElement | null> = ref(null)
const pc = ref<RTCPeerConnection>()
const remoteDesc = ref<HTMLTextAreaElement>()
const remoteVideo = document.createElement('video')
let localStream: Ref<MediaStream | null> = ref(null)



const addVideoStream = (video: HTMLVideoElement, stream: MediaStream) => {
  console.log('添加视频窗口', video, stream);

  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.value!.append(video);
}

function connectToNewUser(userId: string, stream: MediaStream) {
  let video = document.getElementById(userId) as HTMLVideoElement
  if (!video) {
    video = document.createElement('video')
    video.id = userId
    video.autoplay = true
    video.controls = true
    video.muted = true
  }

  addVideoStream(video, stream);
}

function createRTCConnection(): RTCPeerConnection {
  const _pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: ['stun:stun.stunprotocol.org:3478']
      }
    ]
  })
  _pc.onicecandidate = e => {
    if (e.candidate) {
      console.log('candidate', JSON.stringify(e.candidate));
    }
  }

  _pc.ontrack = e => {
    // remote.value!.srcObject = e.streams[0];
    console.log('获取媒体流', e.streams);

    connectToNewUser('test', e.streams[0]);
  }
  console.log('pc 创建成功', _pc);
  return _pc

}

function createOffer(peer: RTCPeerConnection): string {
  let _r = null
  peer.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  })
    .then((sdp) => {
      console.log('Offer', JSON.stringify(sdp));
      peer.setLocalDescription(sdp);
      _r = JSON.stringify(sdp)
    }).catch((err) => {
      console.log(err);
    });
  return JSON.stringify(_r)
}
function createAnswer(peer: RTCPeerConnection): string {
  let r = ''
  peer.createAnswer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  })
    .then((sdp) => {
      console.log('Answer', JSON.stringify(sdp));
      peer.setLocalDescription(sdp);
      r = JSON.stringify(sdp)
    }).catch((err) => {
      console.log(err);

    });
  return r
}

function setRemoteDescription() {
  const remoteSdp = JSON.parse(remoteDesc.value!.value)
  pc.value?.setRemoteDescription(new RTCSessionDescription(remoteSdp))
  console.log('成功设置远程描述信息', remoteSdp);

}

function addCandidate() {
  const candidate = JSON.parse(remoteDesc.value!.value)
  pc.value?.addIceCandidate(new RTCIceCandidate(candidate))
  console.log('添加candiate成功', candidate);
}

function addLocalStreamToRTCConnection() {
  localStream.value?.getTracks().forEach((track, index) => {
    if (localStream.value) {
      pc.value?.addTrack(track, localStream.value)
      console.log('将本地视频流添加到RTC', track);
    }
  });
}

nextTick(() => {
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then(stream => {
    myself.value!.srcObject = stream;
    localStream.value = stream;
    // remote.value!.srcObject = stream
  })
})
// myself.value.scrObject = ''

// const ws = new WS(`ws://${window.location.hostname}/test/`)
// ws.send('连接成功')
// const handleChat2 = (data: any) => console.log(data)
// ws.subscribe('chat', handleChat2)

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
    <button @click="pc = createRTCConnection();" class="btn">创建RTC连接</button>
    <button @click="addLocalStreamToRTCConnection" class="btn">添加视频流</button>
    <button @click="createOffer(pc!)" class="btn">创建offer</button>
    <br />
    <div class="form-control w-80">
      <label class="label">
        <span class="label-text">远程描述</span>
      </label>
      <textarea ref="remoteDesc" class="h-24 textarea textarea-primary" placeholder="Bio"></textarea>
      <button @click="setRemoteDescription" class="btn">设置远程描述</button>
      <button @click="createAnswer(pc!)" class="btn">创建Answer</button>
      <button @click="addCandidate" class="btn">添加candiate</button>
    </div>
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