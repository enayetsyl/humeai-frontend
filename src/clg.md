const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const apiKey = process.env.VITE_DEEPGRAM_API_KEY;

  const handleTranscription = async () => {
    setLoading(true);

    try {
      const response = await axios.post(
        'https://api.deepgram.com/v1/listen',
        {
          url: 'https://res.cloudinary.com/dj3qabx11/video/upload/v1721936278/91-giving-directions_lpalup.mp3'
        },
        {
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setTranscript(response.data.results.channels[0].alternatives[0].transcript);
    } catch (error) {
      console.error('Error fetching transcription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
 
  );
};