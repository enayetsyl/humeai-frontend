import { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const App = () => {
  const [audioUrl, setAudioUrl] = useState('https://res.cloudinary.com/dj3qabx11/video/upload/v1721936278/91-giving-directions_lpalup.mp3');
  const [jobId, setJobId] = useState('');
  const [emotions, setEmotions] = useState([]);
  const [topEmotions, setTopEmotions] = useState([]);
  const [confidence, setConfidence] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [emotionDistribution, setEmotionDistribution] = useState([]);
  const [tableData, setTableData] = useState([]);
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
          const allEmotions = prosody.flatMap(p => p.emotions.map(e => e.name));
          const uniqueEmotions = [...new Set(allEmotions)];
          const emotionCounts = uniqueEmotions.map(emotion => ({
            emotion,
            count: prosody.filter(p => p.emotions.some(e => e.name === emotion)).length,
          }));
          const sortedEmotions = emotionCounts.sort((a, b) => b.count - a.count);
          const topThreeEmotions = sortedEmotions.slice(0, 3).map(e => e.emotion);

          setTopEmotions(topThreeEmotions);

          const newTableData = prosody.map((p, index) => {
            const row = {
              text: p.text,
              startTime: p.time.begin ? p.time.begin.toFixed(2) : '0.00',
              endTime: p.time.end ? p.time.end.toFixed(2) : '0.00',
              confidence: p.confidence ? p.confidence.toFixed(2) : '0.00',
            };
            topThreeEmotions.forEach((emotion, i) => {
              row[`emotion${i + 1}Name`] = emotion;
              row[`emotion${i + 1}Score`] = p.emotions.find(e => e.name === emotion)?.score.toFixed(2) || '0.00';
            });
            return row;
          });

          setTableData(newTableData);

          setEmotions(prosody.flatMap(p => p.emotions));
          setConfidence(prosody.map(p => p.confidence ? p.confidence.toFixed(2) : '0.00'));
          setTimestamps(prosody.map(p => p.time.begin ? p.time.begin.toFixed(2) : '0.00'));
          setEmotionDistribution(prosody.map(p => ({
            text: p.text,
            startTime: p.time.begin ? p.time.begin.toFixed(2) : '0.00',
            endTime: p.time.end ? p.time.end.toFixed(2) : '0.00',
            topEmotions: topThreeEmotions.map(te => ({
              emotion: te,
              score: p.emotions.find(e => e.name === te)?.score.toFixed(2) || '0.00',
            })),
          })));
        }

      } catch (error) {
        console.error('Error fetching job results:', error);
      } finally {
        setIsLoading(false);
      }
    }, 25000);
  };

  const emotionScoresData = {
    labels: topEmotions,
    datasets: [
      {
        label: 'Emotion Scores',
        data: topEmotions.map(emotion => emotions.filter(e => e.name === emotion).reduce((sum, e) => sum + e.score, 0)),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
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
    datasets: topEmotions.map((emotion, index) => ({
      label: emotion,
      data: emotions.filter(e => e.name === emotion).map(e => e.score),
      fill: false,
      borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'][index],
      tension: 0.1,
    })),
  };

  const emotionDistributionData = {
    labels: emotionDistribution.map(d => d.text),
    datasets: topEmotions.map((emotion, index) => ({
      label: emotion,
      data: emotionDistribution.map(d => d.topEmotions.find(e => e.emotion === emotion)?.score),
      backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)', 'rgba(255, 206, 86, 0.2)'][index],
      borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'][index],
      borderWidth: 1,
    })),
  };

  return (
   <div>
 
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
          <Bar data={emotionScoresData} options={{ responsive: true }} />

          <h2>Confidence Over Time</h2>
          <Line data={confidenceOverTimeData} options={{ responsive: true }} />

          <h2>Top Emotions Over Time</h2>
          <Line data={topEmotionsOverTimeData} options={{ responsive: true }} />

          <h2>Emotion Distribution</h2>
          <Bar data={emotionDistributionData} options={{ responsive: true }} />
        </div>
      )}
      {tableData.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Text</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Confidence</th>
              {topEmotions.map((emotion, index) => (
                <th key={index}>{emotion}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                <td>{row.text}</td>
                <td>{row.startTime}</td>
                <td>{row.endTime}</td>
                <td>{row.confidence}</td>
                {topEmotions.map((emotion, i) => (
                  <td key={i}>{row[`emotion${i + 1}Score`]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
   </div>
  );
};

export default App;
