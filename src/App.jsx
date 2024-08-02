import { useState } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const App = () => {
  const [audioUrl, setAudioUrl] = useState('https://res.cloudinary.com/dj3qabx11/video/upload/v1721936278/91-giving-directions_lpalup.mp3');
  const [jobId, setJobId] = useState('');
  const [emotions, setEmotions] = useState([]);
  const [confidence, setConfidence] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [words, setWords] = useState([]);
  const [emotionDistribution, setEmotionDistribution] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const apiKey = import.meta.env.VITE_HUME_API_KEY;
  const handleUrlChange = (event) => {
    setAudioUrl(event.target.value);
  };

  const handleSubmit = async () => {
    if (!audioUrl) return;

    try {
      // Step 1: Send the audio URL to the Hume AI API and get a job ID
      const response = await axios.post(
        'https://api.hume.ai/v0/batch/jobs',
        {
          urls: [audioUrl]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Hume-Api-Key': apiKey
          }
        }
      );
      setJobId(response.data.job_id);
    } catch (error) {
      console.error('Error sending audio URL:', error);
    }
  };

  const checkJobStatus = async () => {
    if (!jobId) return;
    setIsLoading(true);
    // Wait for 25 seconds before checking the job status
    setTimeout(async () => {
      try {
        // Step 2: Fetch job results using the job ID
        const response = await axios.get(
          `https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`,
          {
            headers: {
              'X-Hume-Api-Key': apiKey
            }
          }
        );

        if (response.data[0] && response.data[0].results && response.data[0].results.predictions) {
          const prediction = response.data[0].results.predictions[0]; // Use the first prediction as an example
          const prosody = prediction.models.prosody.grouped_predictions[0].predictions;

          console.log('Prediction:', prediction);
          console.log('Prosody:', prosody);

          const newEmotions = [];
          const newConfidence = [];
          const newTimestamps = [];
          const newWords = [];
          const emotionDist = {};

          prosody.forEach(p => {
            newTimestamps.push((p.time.begin + p.time.end) / 2);
            newConfidence.push(p.confidence);
            newWords.push(p.text);
            p.emotions.sort((a, b) => b.score - a.score); // Sort emotions by score
            p.emotions.slice(0, 3).forEach((emotion, index) => {
              if (!emotionDist[emotion.name]) {
                emotionDist[emotion.name] = new Array(prosody.length).fill(0);
              }
              emotionDist[emotion.name][newWords.length - 1] = emotion.score;
            });
            newEmotions.push(p.emotions);
          });

          setEmotions(newEmotions);
          setConfidence(newConfidence);
          setTimestamps(newTimestamps);
          setWords(newWords);

          const emotionDistData = Object.keys(emotionDist).map(name => {
            return {
              label: name,
              data: emotionDist[name],
              backgroundColor: `rgba(${75 + Math.floor(Math.random() * 180)}, 192, 192, 0.2)`,
              borderColor: `rgba(${75 + Math.floor(Math.random() * 180)}, 192, 192, 1)`,
              borderWidth: 1,
            };
          });
          setEmotionDistribution(emotionDistData);
        }

      } catch (error) {
        console.error('Error fetching job results:', error);
      } finally {
        setIsLoading(false);
      }
    }, 25000);
  };

  const confidenceOverTimeData = {
    labels: timestamps,
    datasets: [
      {
        label: 'Confidence',
        data: confidence,
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
      },
    ],
  };

  const topEmotionsOverTimeData = {
    labels: timestamps,
    datasets: [
      {
        label: 'Top Emotion 1',
        data: emotions.map(emotionSet => emotionSet[0]?.score ?? 0),
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
      },
      {
        label: 'Top Emotion 2',
        data: emotions.map(emotionSet => emotionSet[1]?.score ?? 0),
        fill: false,
        borderColor: 'rgba(54, 162, 235, 1)',
        tension: 0.1,
      },
      {
        label: 'Top Emotion 3',
        data: emotions.map(emotionSet => emotionSet[2]?.score ?? 0),
        fill: false,
        borderColor: 'rgba(255, 206, 86, 1)',
        tension: 0.1,
      },
    ],
  };

  const emotionDistributionData = {
    labels: words,
    datasets: emotionDistribution,
  };

  return (
    <div className='flex justify-center items-center min-h-screen'>
      <h1>Audio Analyzer</h1>
      <input
        type="text"
        placeholder="Enter audio URL"
        value={audioUrl}
        onChange={handleUrlChange}
        className='mr-5'
      />
      <button onClick={handleSubmit}>{isLoading ? "Loading..." : 'Submit'}</button>
      {jobId && (
        <div>
          <p>Job ID: {jobId}</p>
          <button onClick={checkJobStatus}>{isLoading ? 'Loading...' : 'Check Job Status'}</button>
        </div>
      )}
      {emotions.length > 0 && (
        <div>
          <h2>Confidence Over Time</h2>
          <Line data={confidenceOverTimeData} options={{ responsive: true }} />

          <h2>Top Emotions Over Time</h2>
          <Line data={topEmotionsOverTimeData} options={{ responsive: true }} />

          <h2>Emotion Distribution</h2>
          <Bar data={emotionDistributionData} options={{ responsive: true }} />
        </div>
      )}
    </div>
  );
};

export default App;
