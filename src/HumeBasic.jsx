import  { useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


const App = () => {
  const [audioUrl, setAudioUrl] = useState('https://res.cloudinary.com/dj3qabx11/video/upload/v1721936278/91-giving-directions_lpalup.mp3');
  const [jobId, setJobId] = useState('');
  const [emotions, setEmotions] = useState([]);
  const [isLoading, setIsLoading] = useState(false)

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
    setIsLoading(true)
    // Wait for 25 seconds before checking the job status
    setTimeout(async () => {
      try {
        // Step 2: Fetch job results using the job ID
        console.log('before api call')
        const response = await axios.get(
          `https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`,
          {
            headers: {
              'X-Hume-Api-Key': apiKey
            }
          }
        );
        console.log('after api call')
        if (response.data[0] && response.data[0].results && response.data[0].results.predictions) {
          const prediction = response.data[0].results.predictions[0]; // Use the first prediction as an example
          setEmotions(prediction.models.prosody.grouped_predictions[0].predictions[0].emotions);
        }
        
      } catch (error) {
        console.error('Error fetching job results:', error);
      } finally{
        setIsLoading(false)
      }
    }, 25000); // 25 seconds timeout
  };

  const data = {
    labels: emotions.map((emotion) => emotion.name),
    datasets: [
      {
        label: 'Emotion Scores',
        data: emotions.map((emotion) => emotion.score),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
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
          <h2>Emotions Chart</h2>
          <Bar data={data} options={{ responsive: true }} />
        </div>
      )}
    </div>
  );
};

export default App;
