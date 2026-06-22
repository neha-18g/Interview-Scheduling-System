// src/hooks/useTTS.js
import { useState, useRef } from "react";
import client from "../api/client";

export function useTTS() {
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError]     = useState(null);
  const audioRef                    = useRef(null);

  const speak = async (text) => {
    // Stop any currently playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setTtsLoading(true);
    setTtsError(null);

    try {
      const res = await client.post("/api/v1/tts", { text });
      const audioBase64 = res.data.audio;

      // Decode base64 → Blob → Object URL → play
      const binary = atob(audioBase64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/wav" });
      const url  = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url); // clean up memory
        audioRef.current = null;
      };
      await audio.play();
    } catch (err) {
      setTtsError(err.response?.data?.detail || "Could not play audio.");
    } finally {
      setTtsLoading(false);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const isPlaying = () => audioRef.current !== null;

  return { speak, stop, isPlaying, ttsLoading, ttsError };
}