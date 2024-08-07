import  { useState } from 'react';
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
  const [audioUrl, setAudioUrl] = useState('https://res.cloudinary.com/dj3qabx11/video/upload/v1722867224/RT60_BookstoreRecommendation_Regular_z3ugt0.mp3');

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
            const words = sentence.text.split(' ').slice(0, 4).map(word => word.replace(/[.,!?]/g, '').toLowerCase()); // Normalize words
            const uniqueWords = new Set();
            const matchingWords = wordEmotions.filter(wordEmotion => {
              const normalizedWord = wordEmotion.text.replace(/[.,!?]/g, '').toLowerCase(); // Normalize wordEmotion text
              if (uniqueWords.has(normalizedWord) || !words.includes(normalizedWord)) {
                return false;
              }
              uniqueWords.add(normalizedWord);
              return true;
            });
  
            // console.log('words', words); // Added
            // console.log('matchingWords', matchingWords); // Added
  
            const averagedEmotions = {
              Boredom: 0,
              Interest: 0,
              Tiredness: 0,
              Doubt: 0,
              Confusion: 0,
              Disappointment: 0
            };
  
            matchingWords.forEach(wordEmotion => {
              const boredom = wordEmotion.emotions.find(e => e.name === 'Boredom')?.score || 0;
              const interest = wordEmotion.emotions.find(e => e.name === 'Interest')?.score || 0;
              const tiredness = wordEmotion.emotions.find(e => e.name === 'Tiredness')?.score || 0;
              const doubt = wordEmotion.emotions.find(e => e.name === 'Doubt')?.score || 0;
              const confusion = wordEmotion.emotions.find(e => e.name === 'Confusion')?.score || 0;
              const disappointment = wordEmotion.emotions.find(e => e.name === 'Disappointment')?.score || 0;
  
              averagedEmotions.Boredom += boredom;
              averagedEmotions.Interest += interest;
              averagedEmotions.Tiredness += tiredness;
              averagedEmotions.Doubt += doubt;
              averagedEmotions.Confusion += confusion;
              averagedEmotions.Disappointment += disappointment;
            });
  
            const wordCount = matchingWords.length || 1; // Avoid division by zero
            averagedEmotions.Boredom /= wordCount;
            averagedEmotions.Interest /= wordCount;
            averagedEmotions.Tiredness /= wordCount;
            averagedEmotions.Doubt /= wordCount;
            averagedEmotions.Confusion /= wordCount;
            averagedEmotions.Disappointment /= wordCount;
  
            return {
              ...sentence,
              emotions: averagedEmotions
            };
          });
  
          // console.log('sentenceEmotions', sentenceEmotions); // Added
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
      const emotionData = emotions[index]?.emotions || { Boredom: 0, Interest: 0, Tiredness: 0, Doubt: 0, Confusion: 0, Disappointment: 0 };
      speakerEmotionMap[utterance.speaker].push({
        text: utterance.text,
        emotions: emotionData
      });
    });
    console.log('speakerEmotionMap', speakerEmotionMap);
    return speakerEmotionMap;
  };

  const speakerEmotionMap = mapEmotionsToSpeakers();

  const createChartData = (speakerData) => {
    console.log('speakerData', speakerData);
    return {
      labels: speakerData.map((data) => data.text),
      datasets: [
        {
          label: 'Boredom Emotion Score',
          data: speakerData.map((data) => data.emotions.Boredom),
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
        {
          label: 'Interest Emotion Score',
          data: speakerData.map((data) => data.emotions.Interest),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
        {
          label: 'Tiredness Emotion Score',
          data: speakerData.map((data) => data.emotions.Tiredness),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Doubt Emotion Score',
          data: speakerData.map((data) => data.emotions.Doubt),
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1,
        },
        {
          label: 'Confusion Emotion Score',
          data: speakerData.map((data) => data.emotions.Confusion),
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
        {
          label: 'Disappointment Emotion Score',
          data: speakerData.map((data) => data.emotions.Disappointment),
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderColor: 'rgba(255, 159, 64, 1)',
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



