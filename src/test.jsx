import axios from 'axios';
import React from 'react';

const App = () => {
  // const apiKey = 'qlAAV6AybXxrUVIeG2xqNJTtnkyhuRAo21rA5gHlIMVpV4mV';

  const apiKey = 'fNckklwiwNq3JLkoNYJxlcgcaauZgJdQe1AZPeGqm0gjpGsw';

  const audioUrl = 'https://res.cloudinary.com/dj3qabx11/video/upload/v1722643214/89-how-have-you-been_oj2f5r.mp3';

  // Step 1: Start the emotion analysis job
  async function startEmotionAnalysisJob() {
    try {
      const response = await axios.post(
        'https://api.hume.ai/v0/batch/jobs',
        {
          urls: [audioUrl],
          models: {
            language: {}  // Specify the model you want to use
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Hume-Api-Key': apiKey
          }
        }
      );

      const jobId = response.data.job_id;
      console.log('Job started with ID:', jobId);
      return jobId;
    } catch (error) {
      console.error('Error starting job:', error);
      return null;
    }
  }

  // Step 2: Fetch the predictions after the job is completed
  async function fetchEmotionPredictions(jobId) {
    try {
      const response = await axios.get(
        `https://api.hume.ai/v0/batch/jobs/${jobId}/predictions`,
        {
          headers: {
            'X-Hume-Api-Key': apiKey
          }
        }
      );

      console.log('Predictions:', response.data);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  }

  // Example usage
  React.useEffect(() => {
    const runAnalysis = async () => {
      console.log('Job started');
      const jobId = await startEmotionAnalysisJob();
      console.log('Job id received');
      if (jobId) {
        console.log('Inside if block');
        setTimeout(async () => {
          await fetchEmotionPredictions(jobId);
        }, 90000); // Wait 30 seconds before fetching predictions
      }
    };

    runAnalysis();
  }, []);

  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
};

export default App;
