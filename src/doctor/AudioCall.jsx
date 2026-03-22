import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "36a8711c6a374888bf3de28263b4b482";

export default function AudioCall() {

  const [channel, setChannel] = useState("");
  const [token, setToken] = useState("");
  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);

  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);

  // Read params from URL
  useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    setChannel(params.get("channel") || "");
    setToken(params.get("token") || "");

  }, []);
}