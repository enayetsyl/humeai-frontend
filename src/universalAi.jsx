import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const audioUrl = 'https://res.cloudinary.com/dj3qabx11/video/upload/v1722643214/89-how-have-you-been_oj2f5r.mp3';

  const handleTranscribe = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'https://api.assemblyai.com/v2/transcript',
        {
          audio_url: audioUrl,
          speaker_labels: true, // Enable diarization
        },
        {
          headers: {
            authorization: import.meta.env.VITE_UNIVERSAL_API_KEY,
            'content-type': 'application/json',
          },
        }
      );

      const { id } = response.data;
      const checkStatusInterval = setInterval(async () => {
        const statusResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, {
          headers: {
            authorization: import.meta.env.VITE_UNIVERSAL_API_KEY,
          },
        });

        if (statusResponse.data.status === 'completed') {
          clearInterval(checkStatusInterval);
          const utterances = statusResponse.data.utterances || [];
          setTranscript(formatTranscript(utterances));
          setLoading(false);
        } else if (statusResponse.data.status === 'failed') {
          clearInterval(checkStatusInterval);
          setTranscript('Transcription failed');
          setLoading(false);
        }
      }, 5000); // Check every 5 seconds
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setTranscript('Error transcribing audio');
      setLoading(false);
    }
  };

  const formatTranscript = (utterances) => {
    return utterances.map(utterance => `Speaker ${utterance.speaker}: ${utterance.text}`).join('\n');
  };

  return (
    <div>
      <h1>Audio Transcription with Diarization</h1>
      <button onClick={handleTranscribe} disabled={loading}>
        {loading ? 'Transcribing...' : 'Transcribe Audio'}
      </button>
      {transcript && <pre>{transcript}</pre>}
    </div>
  );
};

export default App;
