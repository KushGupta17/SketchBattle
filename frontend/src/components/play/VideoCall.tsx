import { useEffect, useRef, useState } from "react";
import { Card, Button, message, Tooltip } from "antd";
import { LuVideo, LuVideoOff, LuMic, LuMicOff } from "react-icons/lu";
import { Socket } from "socket.io-client";
import { Player } from "../../types/types";

// Define props for the VideoStream sub-component
interface VideoStreamProps {
  stream: MediaStream;
  muted: boolean;
  username: string;
}

const VideoStream = ({ stream, muted, username }: VideoStreamProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState<boolean>(() =>
    stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live")
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }

    const updateVideoState = () => {
      setHasVideo(
        stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live")
      );
    };

    updateVideoState();
    stream.addEventListener("addtrack", updateVideoState);
    stream.addEventListener("removetrack", updateVideoState);

    return () => {
      stream.removeEventListener("addtrack", updateVideoState);
      stream.removeEventListener("removetrack", updateVideoState);
    };
  }, [stream]);

  if (!hasVideo) {
    return (
      <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex flex-col items-center justify-center text-white overflow-hidden p-2 border border-slate-700/50 shadow-inner">
        <audio
          ref={(audioEl) => {
            if (audioEl && audioEl.srcObject !== stream) {
              audioEl.srcObject = stream;
              audioEl.play().catch(() => {});
            }
          }}
          autoPlay
          muted={muted}
        />
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1 animate-pulse">
          <LuMic className="w-4 h-4" />
        </div>
        <div className="text-white text-xs font-bold truncate max-w-[90%]">
          {username}
        </div>
        <div className="text-[10px] text-emerald-300 font-medium">Voice connected</div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 left-1 text-white text-xs bg-black/60 px-2 py-0.5 rounded font-medium">
        {username}
      </div>
    </div>
  );
};

// Define props for the main VideoCall component
interface VideoCallProps {
  socket: Socket | null;
  players: Player[];
  selfId?: string;
}

const VideoCall = ({ socket, players, selfId }: VideoCallProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Map<string, { stream: MediaStream; username: string }>
  >(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;

  const drainCandidates = async (sid: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidates.current.get(sid) || [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn("Error adding queued ICE candidate:", err);
      }
    }
    pendingCandidates.current.delete(sid);
  };

  const renegotiate = (pc: RTCPeerConnection, sid: string) => {
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription && socket) {
          socket.emit("webrtc-offer", {
            to: sid,
            offer: pc.localDescription,
          });
        }
      })
      .catch((err) => console.error("Error creating renegotiation offer:", err));
  };

  const getPeerConnection = (sid: string, username: string): RTCPeerConnection => {
    if (!peerConnections.current.has(sid)) {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStreamRef.current!));
      }

      pc.ontrack = (event: RTCTrackEvent) => {
        if (event.streams && event.streams[0]) {
          setRemoteStreams((prev) =>
            new Map(prev).set(sid, { stream: event.streams[0], username })
          );
        }
      };

      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate && socket) {
          socket.emit("webrtc-ice-candidate", {
            to: sid,
            candidate: event.candidate,
          });
        }
      };

      peerConnections.current.set(sid, pc);
    }
    return peerConnections.current.get(sid)!;
  };

  // Completely decoupled Microphone toggle logic
  const toggleAudio = async () => {
    try {
      if (!isAudioEnabled) {
        // User wants to turn microphone ON
        let stream = localStreamRef.current;
        let audioTrack = stream?.getAudioTracks()[0];

        if (!audioTrack || audioTrack.readyState === "ended") {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newAudioTrack = micStream.getAudioTracks()[0];
          newAudioTrack.enabled = true;

          if (!stream) {
            stream = new MediaStream([newAudioTrack]);
            setLocalStream(stream);
            localStreamRef.current = stream;
          } else {
            stream.addTrack(newAudioTrack);
            setLocalStream(new MediaStream(stream.getTracks()));
            localStreamRef.current = stream;
          }

          // Add to all existing peer connections and renegotiate
          peerConnections.current.forEach((pc, sid) => {
            pc.addTrack(newAudioTrack, stream!);
            renegotiate(pc, sid);
          });
        } else {
          audioTrack.enabled = true;
        }

        setIsAudioEnabled(true);
        message.success("Microphone unmuted");
      } else {
        // User wants to MUTE microphone
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }
        setIsAudioEnabled(false);
        message.info("Microphone muted");
      }
    } catch (err) {
      console.error("Error toggling audio:", err);
      message.error("Could not access microphone. Please check permissions.");
    }
  };

  // Completely decoupled Camera Video toggle logic
  const toggleVideo = async () => {
    try {
      if (!isVideoEnabled) {
        // User wants to turn camera ON
        let stream = localStreamRef.current;
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = camStream.getVideoTracks()[0];
        newVideoTrack.enabled = true;

        if (!stream) {
          stream = new MediaStream([newVideoTrack]);
          setLocalStream(stream);
          localStreamRef.current = stream;
        } else {
          stream.addTrack(newVideoTrack);
          setLocalStream(new MediaStream(stream.getTracks()));
          localStreamRef.current = stream;
        }

        // Add to all peer connections and renegotiate
        peerConnections.current.forEach((pc, sid) => {
          pc.addTrack(newVideoTrack, stream!);
          renegotiate(pc, sid);
        });

        setIsVideoEnabled(true);
        message.success("Camera started");
      } else {
        // User wants to turn camera OFF (stops video track, keeps audio completely intact)
        if (localStreamRef.current) {
          const stream = localStreamRef.current;
          const videoTracks = stream.getVideoTracks();
          videoTracks.forEach((track) => {
            track.stop();
            stream.removeTrack(track);
          });

          // Remove video senders from each peer connection
          peerConnections.current.forEach((pc, sid) => {
            const senders = pc.getSenders();
            senders.forEach((sender) => {
              if (sender.track?.kind === "video") {
                try {
                  pc.removeTrack(sender);
                } catch (e) {
                  console.warn("Could not remove video sender:", e);
                }
              }
            });
            renegotiate(pc, sid);
          });

          if (stream.getTracks().length === 0) {
            setLocalStream(null);
            localStreamRef.current = null;
          } else {
            setLocalStream(new MediaStream(stream.getTracks()));
          }
        }
        setIsVideoEnabled(false);
        message.info("Camera stopped");
      }
    } catch (err) {
      console.error("Error toggling video:", err);
      message.error("Could not access camera. Please check permissions.");
    }
  };

  // Always listen for incoming signaling so spectators/non-streamers can receive remote feeds
  useEffect(() => {
    if (!socket) return;

    const handleOffer = async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      const player = players.find((p: Player) => p.socketId === from);
      const username = player ? player.username : "Player";
      const pc = getPeerConnection(from, username);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainCandidates(from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { to: from, answer });
      } catch (err) {
        console.error("Error handling WebRTC offer:", err);
      }
    };

    const handleAnswer = async ({
      from,
      answer,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const pc = peerConnections.current.get(from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainCandidates(from, pc);
        } catch (err) {
          console.error("Error handling WebRTC answer:", err);
        }
      }
    };

    const handleIceCandidate = async ({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = peerConnections.current.get(from);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      } else {
        if (!pendingCandidates.current.has(from)) {
          pendingCandidates.current.set(from, []);
        }
        pendingCandidates.current.get(from)!.push(candidate);
      }
    };

    const handleUserLeft = (sid: string) => {
      if (peerConnections.current.has(sid)) {
        peerConnections.current.get(sid)?.close();
        peerConnections.current.delete(sid);
      }
      pendingCandidates.current.delete(sid);
      setRemoteStreams((prev) => {
        const newStreams = new Map(prev);
        newStreams.delete(sid);
        return newStreams;
      });
    };

    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);

    return () => {
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
    };
  }, [socket, players]);

  // When ANY local track (audio or video) is enabled, initiate connection to peers that don't have one
  useEffect(() => {
    if (!socket || (!isVideoEnabled && !isAudioEnabled) || !localStream) return;

    players.forEach((player: Player) => {
      if (
        player.socketId &&
        player.socketId !== selfId &&
        !peerConnections.current.has(player.socketId)
      ) {
        const pc = getPeerConnection(player.socketId, player.username);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (pc.localDescription) {
              socket.emit("webrtc-offer", {
                to: player.socketId,
                offer: pc.localDescription,
              });
            }
          })
          .catch((err) => console.error("Error creating offer:", err));
      }
    });
  }, [socket, isVideoEnabled, isAudioEnabled, localStream, players, selfId]);

  // Cleanup all media tracks and connections on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();
    };
  }, []);

  const hasStreams = (isVideoEnabled && !!localStream) || remoteStreams.size > 0;

  return (
    <Card className="bg-white/95 backdrop-blur-md border border-purple-100 shadow-sm rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 flex-wrap gap-2">
        <h3 className="font-bold text-gray-800 flex items-center text-sm sm:text-base">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mr-2">
            <LuVideo className="w-4 h-4" />
          </div>
          Voice & Video
        </h3>

        <div className="flex items-center gap-1.5">
          {/* Decoupled Microphone Control */}
          <Tooltip title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}>
            <Button
              type={isAudioEnabled ? "primary" : "default"}
              icon={isAudioEnabled ? <LuMic /> : <LuMicOff />}
              onClick={toggleAudio}
              size="middle"
              className={`!rounded-xl !font-bold transition-colors ${
                isAudioEnabled
                  ? "!bg-emerald-600 hover:!bg-emerald-500 !border-0 text-white"
                  : "!border-gray-200 text-gray-600 hover:text-gray-900"
              }`}
            >
              {isAudioEnabled ? "Mic On" : "Mic Off"}
            </Button>
          </Tooltip>

          {/* Decoupled Camera / Video Control */}
          <Tooltip title={isVideoEnabled ? "Stop Camera Video" : "Start Camera Video"}>
            <Button
              type={isVideoEnabled ? "primary" : "default"}
              icon={isVideoEnabled ? <LuVideoOff /> : <LuVideo />}
              onClick={toggleVideo}
              danger={isVideoEnabled}
              size="middle"
              className="!rounded-xl !font-bold transition-colors"
            >
              {isVideoEnabled ? "Stop Video" : "Start Video"}
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Local Video Stream View */}
        {isVideoEnabled && localStream && (
          <div className="relative">
            <VideoStream stream={localStream} muted={true} username="You" />
            <div className="absolute top-1.5 right-1.5">
              <Tooltip title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}>
                <Button
                  icon={isAudioEnabled ? <LuMic /> : <LuMicOff />}
                  size="small"
                  shape="circle"
                  onClick={toggleAudio}
                  className={`shadow-sm ${
                    isAudioEnabled
                      ? "!bg-emerald-600 !text-white !border-0"
                      : "!bg-rose-600 !text-white !border-0"
                  }`}
                />
              </Tooltip>
            </div>
          </div>
        )}

        {/* Local Audio-Only Presence (Camera Off, Mic On) */}
        {!isVideoEnabled && isAudioEnabled && (
          <div className="relative aspect-video bg-gradient-to-br from-indigo-900 to-purple-950 rounded-lg flex flex-col items-center justify-center text-white overflow-hidden p-2 border border-indigo-700/50 shadow-inner">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1 animate-pulse">
              <LuMic className="w-4 h-4" />
            </div>
            <div className="text-white text-xs font-bold">You (Mic Live)</div>
            <div className="text-[10px] text-emerald-300">Camera Off</div>
          </div>
        )}

        {/* Remote Streams */}
        {Array.from(remoteStreams.values()).map(({ stream, username }, index) => (
          <VideoStream
            key={index}
            stream={stream}
            muted={false}
            username={username}
          />
        ))}
      </div>

      {/* Empty State when no video and no remote feeds */}
      {!hasStreams && !(!isVideoEnabled && isAudioEnabled) && (
        <div className="w-full aspect-video bg-slate-50 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-gray-400 p-3">
          <div className="flex items-center gap-2 mb-1 text-gray-300">
            <LuMicOff className="w-5 h-5" />
            <LuVideo className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-gray-500">Video & audio are off</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Toggle Mic or Video above to join</p>
        </div>
      )}
    </Card>
  );
};

export default VideoCall;