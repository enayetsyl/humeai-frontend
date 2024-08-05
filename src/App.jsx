import React, { useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const App = () => {
  const [transcript, setTranscript] = useState([]);
  const [loadingTranscription, setLoadingTranscription] = useState(false);
  const [loadingEmotionAnalysis, setLoadingEmotionAnalysis] = useState(false);
  const [loadingEmotionFetch, setLoadingEmotionFetch] = useState(false);
  const [jobId, setJobId] = useState('');
  const [emotions, setEmotions] = useState([]);
  const [audioUrl, setAudioUrl] = useState('');

  const handleTranscribe = async () => {
    setLoadingTranscription(true);
    try {
      const response = await axios.post(
        'https://api.assemblyai.com/v2/transcript',
        {
          audio_url: audioUrl,
          speaker_labels: true,
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
          console.log('utterances', utterances);
          setTranscript(utterances);
          setLoadingTranscription(false);
        } else if (statusResponse.data.status === 'failed') {
          clearInterval(checkStatusInterval);
          setTranscript('Transcription failed');
          setLoadingTranscription(false);
        }
      }, 5000);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setTranscript('Error transcribing audio');
      setLoadingTranscription(false);
    }
  };

  const handleEmotionAnalysis = async () => {
    setLoadingEmotionAnalysis(true);
    try {
      const response = await axios.post(
        'https://api.hume.ai/v0/batch/jobs',
        {
          urls: [audioUrl]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Hume-Api-Key': import.meta.env.VITE_HUME_API_KEY
          }
        }
      );

      const jobId = response.data.job_id;
      setJobId(jobId);
      console.log('jobid', jobId)
      setLoadingEmotionAnalysis(false);
    } catch (error) {
      console.error('Error sending audio URL:', error);
      setLoadingEmotionAnalysis(false);
    }
  };

  const handleFetchEmotions = async () => {
    setLoadingEmotionFetch(true);
    setTimeout(async () => {
      try {
        const resultResponse = await axios.get(
          `https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`,
          {
            headers: {
              'X-Hume-Api-Key': import.meta.env.VITE_HUME_API_KEY
            }
          }
        );

        if (resultResponse.data[0] && resultResponse.data[0].results && resultResponse.data[0].results.predictions) {
          const prediction = resultResponse.data[0].results.predictions[0];
          console.log('prediction', prediction);
          const wordEmotions = prediction.models.language.grouped_predictions[0].predictions;
          
          const sentenceEmotions = transcript.map(sentence => {
            const words = sentence.text.split(' ').slice(0, 4); // Get first 4 words
            const matchingWords = wordEmotions.filter(wordEmotion => words.includes(wordEmotion.text));

            const averagedEmotions = {
              Interest: 0,
              Excitement: 0,
              SurprisePositive: 0,
              SurpriseNegative: 0
            };

            matchingWords.forEach(wordEmotion => {
              const interest = wordEmotion.emotions.find(e => e.name === 'Interest')?.score || 0;
              const excitement = wordEmotion.emotions.find(e => e.name === 'Excitement')?.score || 0;
              const surprisePositive = wordEmotion.emotions.find(e => e.name === 'Surprise (positive)')?.score || 0;
              const surpriseNegative = wordEmotion.emotions.find(e => e.name === 'Surprise (negative)')?.score || 0;

              averagedEmotions.Interest += interest;
              averagedEmotions.Excitement += excitement;
              averagedEmotions.SurprisePositive += surprisePositive;
              averagedEmotions.SurpriseNegative += surpriseNegative;
            });

            const wordCount = matchingWords.length || 1; // Avoid division by zero
            averagedEmotions.Interest /= wordCount;
            averagedEmotions.Excitement /= wordCount;
            averagedEmotions.SurprisePositive /= wordCount;
            averagedEmotions.SurpriseNegative /= wordCount;

            return {
              ...sentence,
              emotions: averagedEmotions
            };
          });

          setEmotions(sentenceEmotions);
        }
      } catch (error) {
        console.error('Error fetching job results:', error);
      } finally {
        setLoadingEmotionFetch(false);
      }
    }, 25000); // 25 seconds timeout
  };

  const mapEmotionsToSpeakers = () => {
    const speakerEmotionMap = {};

    transcript.forEach((utterance, index) => {
      if (!speakerEmotionMap[utterance.speaker]) {
        speakerEmotionMap[utterance.speaker] = [];
      }
      const emotionData = emotions[index]?.emotions || { Interest: 0, Excitement: 0, SurprisePositive: 0, SurpriseNegative: 0 };
      speakerEmotionMap[utterance.speaker].push({
        text: utterance.text,
        emotions: emotionData
      });
    });

    return speakerEmotionMap;
  };

  const speakerEmotionMap = mapEmotionsToSpeakers();

  const createChartData = (speakerData) => {
    return {
      labels: speakerData.map((data) => data.text),
      datasets: [
        {
          label: 'Interest Emotion Score',
          data: speakerData.map((data) => data.emotions.Interest),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Excitement Emotion Score',
          data: speakerData.map((data) => data.emotions.Excitement),
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
        {
          label: 'Surprise (Positive) Emotion Score',
          data: speakerData.map((data) => data.emotions.SurprisePositive),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Surprise (Negative) Emotion Score',
          data: speakerData.map((data) => data.emotions.SurpriseNegative),
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1,
        }
      ],
    };
  };

  return (
    <div className='p-10 max-h-screen max-w-1/2'>
      <h1>Audio Transcription and Emotion Analysis</h1>
      <input 
        type="text" 
        placeholder="Enter audio URL" 
        value={audioUrl} 
        onChange={(e) => setAudioUrl(e.target.value)} 
        className="mb-4 p-2 border"
      />
      <button onClick={handleTranscribe} disabled={loadingTranscription || loadingEmotionAnalysis || loadingEmotionFetch}>
        {loadingTranscription ? 'Transcribing...' : 'Transcribe Audio'}
      </button>
      {transcript.length > 0 && (
        <button onClick={handleEmotionAnalysis} disabled={loadingEmotionAnalysis || loadingEmotionFetch}>
          {loadingEmotionAnalysis ? 'Analyzing Emotions...' : 'Analyze Emotions'}
        </button>
      )}
      {jobId && (
        <button onClick={handleFetchEmotions} disabled={loadingEmotionFetch}>
          {loadingEmotionFetch ? 'Fetching Emotions...' : 'Fetch Emotions'}
        </button>
      )}
      <div className="mt-4">
        {transcript.map((utterance, index) => (
          <div key={index}>
            <strong>Speaker {utterance.speaker}:</strong> {utterance.text}
          </div>
        ))}
      </div>
      {Object.keys(speakerEmotionMap).map(speaker => (
        <div key={speaker}>
          <h2>Speaker {speaker}</h2>
          <Bar data={createChartData(speakerEmotionMap[speaker])} options={{ responsive: true }} />
        </div>
      ))}
    </div>
  );
};

export default App;
