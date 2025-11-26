const apiKey = "AIzaSyC1MdRv-JVQvT0QILqn6BGpfZrkSURVVfs"; 

async function checkModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        console.log("❌ API KEY ERROR:", data.error.message);
    } else {
        console.log("✅ YOUR AVAILABLE MODELS:");
        // Filter to show only the ones you care about
        const models = data.models.filter(m => m.name.includes('gemini'));
        models.forEach(m => console.log(`   ${m.name}`));
    }
  } catch (err) {
    console.log("Network Error:", err);
  }
}

checkModels();