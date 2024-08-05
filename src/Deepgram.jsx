import axios from "axios";
import { useState } from "react";

const Deepgram = () => {
  const [transcript, setTranscript] = useState('')
const [transcriptWithTimestamps, setTranscriptWithTimestamps] = useState([]);

const [loading, setLoading] = useState(false);
const [audioUrlDG, setAudioUrlDG] = useState('https://res.cloudinary.com/dj3qabx11/video/upload/v1721936278/91-giving-directions_lpalup.mp3');
const apiKeyDeepgram = import.meta.env.VITE_DEEPGRAM_API_KEY;

const handleTranscription = async () => {
  setLoading(true);

  try {
    const response = await axios.post(
      'https://api.deepgram.com/v1/listen',
      {
        url: audioUrlDG
      },
      {
        headers: {
          Authorization: `Token ${apiKeyDeepgram}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const transcript = response.data.results.channels[0].alternatives[0].transcript;
    const wordsWithTimestamps = response.data.results.channels[0].alternatives[0].words.map(word => ({
      startTime: word.start,
      endTime: word.end,
      word: word.word
    }));

    setTranscript(transcript);
    setTranscriptWithTimestamps(wordsWithTimestamps);
  } catch (error) {
    console.error('Error fetching transcription:', error);
  } finally {
    setLoading(false);
  }
};


const handleDGUrlChange = (event) => {
  setAudioUrlDG(event.target.value);
};
  return (
    <div>
    <h1>Voice to Text Converter</h1>
    <input
      type="text"
      placeholder="Enter audio URL"
      value={audioUrlDG}
      onChange={handleDGUrlChange}
      className='mr-5'
    />
    <button onClick={handleTranscription} disabled={loading}>
      {loading ? 'Transcribing...' : 'Convert Voice to Text'}
    </button>
    {transcript && (
      <div>
        <h2>Transcript:</h2>
        <p>{transcript}</p>
      </div>
    )}
    {transcriptWithTimestamps.length > 0 && (
      <div>
        <h2>Transcript with Timestamps:</h2>
        <ul>
          {transcriptWithTimestamps.map((item, index) => (
            <li key={index}>
              <strong>{item.word}</strong> (Start: {item.startTime.toFixed(2)}s, End: {item.endTime.toFixed(2)}s)
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>

  )
}

export default Deepgram