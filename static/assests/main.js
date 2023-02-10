
const baseUrl = "/"
 
let localVideo = document.querySelector('#localVideo')
let remoteVideo = document.querySelector('#remoteVideo')

let otherUser;
let remoteRTCMessage;



let iceCandisateaFromCaller = []
let peerConnection;
let remoteStream;
let localStream;

let myName;

function login() {
    let userName = document.querySelector('#userNameInput').value
    myName =userName
    document.querySelector('#userName').style.display = "none"
    document.querySelector('#call').style.display = "block"
    document.querySelector('#nameHere').innerHTML = userName
    document.querySelector('#userInfo').style.display = "block"

    connectSocket()
}

function call(){
    let userToCall = document.querySelector('#callName').value
    otherUser = userToCall

    beReady()
    .then(()=> {
        processCall(userToCall);
    })
}

function answer() {
    beReady()
    .then(()=>{
        processAccept();
    })

    document.querySelector('#answer').style.display = 'none'
}

let pcConfig = {
    "iceServers":[
        {"url": "stun:stun.jap.vidcall.com:2521"},
        {
            "url":"turn:turn.jap.vidcall.com:2521",
            "username":"guest",
            "credental": "somepassword"
        }
    ]
}

let sdpConstrain = {
    offerToReceiveAudio: true,
    offerToReceivevideo: true,
}

let socket;

function connectSocket() {
    socket = io.connect(baseUrl, {
        query:{
            name: myName
        }
    })

    socket.on('newCall', data=>{
        console.log(data);

        otherUser = data.caller;
        remoteRTCMessage = data.rtcMessage;

        document.querySelector('#callerName').innerHTML = otherUser
        document.querySelector('#call').style.display = 'none'
        document.querySelector('#answer').style.display = 'block'

    })

    socket.on('callAnswered', data=>{
        remoteRTCMessage = data.rtcMessage;
        peerConnection.setRemoteDescription(new RTCSessionDescription(remoteRTCMessage));

        document.querySelector('#calling').style.display = 'none'

        callProgress()
    })

    socket.on('ICEcandidate', data =>{
        let message = data.rtcMessage

        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        })

        if(peerConnection){
            peerConnection.addIceCandidate(candidate)
        }else{
            iceCandisateaFromCaller.push(candidate)
        }
    })
}

function sendCall(data) {
    console.log("send Call");
    socket.emit('call', data )
    document.querySelector('#call').style.display = 'none'
    document.querySelector('#otherUserNameCA').innerHTML = otherUser
    document.querySelector('#calling').style.display ='block'

}

function answerCall(data) {
    socket.emit('answerCall',data)
    callProgress()
}

function sendICEcandidate(data){
    socket.emit('ICEcandidate',data)
}

function beReady() {
    return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    .then(stream =>{
        localStream = stream;
        localVideo.srcObject =stream;
        return createConnectionAndAddStream()
    } )
    .catch(function (e){
        alert('getUserMedia() error:' + e.name);
    })
}

function createConnectionAndAddStream(){
    createPeerConnection();
    peerConnection.addStream(localStream);
    return true;
}

function processCall(userName){
    peerConnection.createOffer(sessionDescription =>  {
        peerConnection.createOffer(sessionDescription)
        sendCall({
            name:userName,
            rtcMessage: sessionDescription
        })
    }),(error)=>{
        console.log('error');
    }

}

//manashu yerdan boshlanadi

function processAccept() {
    peerConnection.setRemoteDescription(new RTCSessionDescription(remoteRTCMessage));
    peerConnection.createAnswer((sessionDescription) => {
        peerConnection.setLocalDescription(sessionDescription);

        if (iceCandidatesFromCaller.length > 0) {
            for(let i = 0; i < iceCandisatesFromCaller.length; i++ ){
                let candidate = addIceCandidatesFromCaller[i];
                console.log("ICE candidate Added From queue");
                try {
                    peerConnection.addIceCandidate(candidate).then(done => {
                        console.log(done);
                    })
                } catch (error) {
                    console.log(error);
                }
            }
            iceCandidatesFromCaller=[];
            console.log("ICE candidate queue cleared");
        }else{
            console.log("NO Ice candidate in queue");
        }
        answerCall({
            caller: otherUser,
            rtcMessage: sessionDescription
        },(error) =>{
            console.log("Error");
        })

    })
}


function createPeerConnection() {
    try {
        peerConnection = new RTCPeerConnection(pcConfig);
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream =handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnection');
    } catch (e) {
        console.log('Failed to create PeerConnection, expection:' + e.message);
        alert('Connection create PeerConnection object.');
        return;
    }
}

function handleIceCandidate(event) {
    if (event.candidate) {
        console.log("Local ICE candidate");

        sendICEcandidate({
            user:otherUser,
            rtcMessage:{
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }
        })
    }else{
        console.log('End of candidates.');
    }
}

function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event:',event);
    remoteVideo.srcObject = null
    localVideo.srcObject = null
}

function callProgress() {
    document.querySelector("#videos").style.display = "block";
    document.querySelector("#otherUserNameC").innerHTML = otherUser;
    document.querySelector("#inCall").style.display = "block";
}