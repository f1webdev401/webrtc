let socket = io();
let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");
let divBtnGroup = document.getElementById("btn-group")
let muteBtn = document.getElementById("muteButton")
let leaveBtn = document.getElementById("leaveButton")
let hideCameraBtn = document.getElementById("hideCameraButton")

let roomName ;
let muteFlag = false
let hideCameraFlag = false
let creator = false
let rtcPeerConnection;
let userStream;
let iceServers = {
  iceServers: [
    {urls: "stun:stun2.l.google.com:19302"},
    {urls: "stun:stun3.l.google.com:19302"}
  ]
}

let pendingCandidates= [];
joinButton.addEventListener('click',() => {
  if(roomInput.value === "") {
    alert('please enter a room name')
  }else {
    roomName = roomInput.value;
    socket.emit('join',roomName)
  }
})

muteBtn.addEventListener('click',() => {
  muteFlag = !muteFlag
  if(muteFlag) {
    muteBtn.textContent = 'Unmute'
    userStream.getAudioTracks()[0].enabled = false
  }else {
    muteBtn.textContent = 'Mute'
    userStream.getAudioTracks()[0].enabled = true
  }
})
hideCameraBtn.addEventListener('click',() => {
    hideCameraFlag = !hideCameraFlag
    if(hideCameraFlag) {
    userStream.getTracks()[0].enabled = false
      hideCameraBtn.textContent = 'Show Camera'
    }else {
      hideCameraBtn.textContent = 'Hide Camera'
    userStream.getTracks()[0].enabled = true
    }
})
socket.on('created',function(){
  creator = true
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {width: 1200 , height: 720},
    })
    .then((stream) => {
      divVideoChatLobby.style = 'display:none'
      divBtnGroup.style  = 'display:flex'
      userVideo.srcObject = stream
      userVideo.onloadedmetadata = function(e) {
        userVideo.play()
      }
      userStream = stream
      socket.emit("ready",roomName)
    })
    .catch(() => {
      alert("couldnt ")
    })
})
socket.on('joined',function(){
  creator = false
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {width: 1200 , height: 720},
    })
    .then((stream) => {
      divVideoChatLobby.style = 'display:none'
      divBtnGroup.style  = 'display:flex'
      userStream = stream
      userVideo.srcObject = stream
      userVideo.onloadedmetadata = function(e) {
        userVideo.play()
      }
      socket.emit('ready',roomName)
    })
    .catch(() => {
      alert("Coulnt access user media")
    })

})
socket.on('full',function(){
    alert("Room is full of shhit")
})

socket.on('ready',function(){
  console.log('ready')
  console.log(userStream.getTracks()[0])
  if(creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    if (userStream && userStream.getTracks().length >= 1) {
      // Add the first track from userStream (assuming it's video)
      userStream.getTracks().forEach(track => {
        rtcPeerConnection.addTrack(track, userStream);
    });
    }
    rtcPeerConnection.createOffer()
    .then((offer) => rtcPeerConnection.setLocalDescription(offer))
    .then(() => {
      socket.emit('offer', rtcPeerConnection.localDescription, roomName); 
    })
    .catch(function(error) {console.log(error)})
  }
})
socket.on('candidate',function(candidate){
  if (rtcPeerConnection.remoteDescription === null) {
    pendingCandidates.push(candidate);
  } else {
    // Otherwise, add the ICE candidate immediately
    addIceCandidate(candidate);
  }
})
socket.on('offer',function(offer){
  if(!creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.setRemoteDescription(offer)
            .then(() => {
                pendingCandidates.forEach(candidate => addIceCandidate(candidate));
                pendingCandidates = []; // Clear the queue

                if (userStream && userStream.getTracks().length >= 1) {
                  // Add the first track from userStream (assuming it's video)
                  userStream.getTracks().forEach(track => {
                    rtcPeerConnection.addTrack(track, userStream);
                });
                }

                return rtcPeerConnection.createAnswer();
            })
            .then((answer) => rtcPeerConnection.setLocalDescription(answer))
            .then(() => {
                socket.emit('answer', rtcPeerConnection.localDescription, roomName);
            })
            .catch(error => {
                console.error('Error handling offer:', error);
            });
  }
})
socket.on('answer',function(answer){
  if (rtcPeerConnection.signalingState === 'have-local-offer' ||
  rtcPeerConnection.signalingState === 'have-remote-offer') {
  rtcPeerConnection.setRemoteDescription(answer)
      .then(() => {
          console.log('Remote description set successfully');
          // Do further processing if needed
      })
      .catch(error => {
          console.error('Error setting remote description:', error);
      });
} else {
  console.warn('Attempted to set remote description in an inappropriate state:', rtcPeerConnection.signalingState);
}
})


leaveBtn.addEventListener('click',() => {
  socket.emit('leave',roomName)
  divVideoChatLobby.style = 'display:block'
  divBtnGroup.style = 'display:none'
  console.log(userVideo.srcObject.getTracks())
  if(userVideo.srcObject) {
    userVideo.srcObject.getTracks()[0].stop()
    userVideo.srcObject.getTracks()[1].stop()
   
  }
  if(peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop()
    peerVideo.srcObject.getTracks()[1].stop()
  }
  if(rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null
    rtcPeerConnection.close()
    rtcPeerConnection = null
  }
 })
 socket.on('leave',() => {
  if(peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop()
    peerVideo.srcObject.getTracks()[1].stop()
  }
  if(rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
rtcPeerConnection.onicecandidate = null
    rtcPeerConnection.close()
    rtcPeerConnection = null
  }
 })
function OnIceCandidateFunction(event) {
  if(event.candidate) {
    socket.emit('candidate',event.candidate,roomName)
  }  
}

function OnTrackFunction(event) {
  if (event.streams && event.streams.length > 0) {
    peerVideo.srcObject = event.streams[0];
    // Play the peer video stream only when the user interacts with the page
    peerVideo.onloadedmetadata = function(e) {
      if (isAndroid()) {
        // On Android, play the video when the user clicks on the page
        document.addEventListener('click', function() {
          peerVideo.play();
        }, { once: true }); // Ensure the event listener is removed after being triggered once
      } else {
        // On other platforms, autoplay the video
        peerVideo.play();
      }
    };
  } else {
    console.error("No stream found in the event");
  }
}

function addIceCandidate(candidate){
  let iceCandidate = new RTCIceCandidate(candidate)
  rtcPeerConnection.addIceCandidate(iceCandidate)
  .then(() => {
    console.log("Ice candidate added successfully.");
  })
  .catch((error) => {
    console.error("Error adding ice candidate:", error);
  });
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}