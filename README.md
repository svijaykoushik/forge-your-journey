# Forge your Journey

Step into **Forge your Journey**, the groundbreaking text-based RPG where you are the architect of your own epic tale. This isn't just a "choose your own adventure"; it's a living story that adapts dynamically to your every decision.

At the heart of your experience is an advanced AI Dungeon Master, powered by Google's cutting-edge Gemini for story generation and Imagen for vivid scene visualization. This powerful combination means every plot twist, character interaction, and environmental detail is uniquely crafted in real-time, just for you.

## How you play shapes everything:

- **Boundless Choices**: Every decision you make twists the narrative, leading to truly unique outcomes.
- **Dynamic Genres**: Influence your adventure's setting by choosing from fantasy, sci-fi, mystery, and more.
- **Persona-Driven Gameplay**: Adopt a unique persona to further influence the narrative, creating tailored challenges and opportunities.

Embark on unique quests where your choices truly shape the narrative and the world around you. Forge your Journey lets you sculpt your destiny, one choice at a time. Dive into a boundless narrative where every play-through is a new adventure, uniquely crafted by your imagination and the limitless creativity of our AI.

## Features

- **AI-Powered Storytelling**: Dynamic narrative generation using Google's Gemini API.
- **AI-Generated Imagery**: (Optional) Vivid scene visualization powered by Imagen to enhance your adventure.
- **Multiple Genres**: Explore fantasy, sci-fi, mystery, and more.
- **Persona System**: Adopt different personas to influence gameplay and story.
- **Truly Unique Adventures**: No two playthroughs are the same.

## Run Locally

Follow these instructions to get your own instance of Forge your Journey running on your local machine.

**Prerequisites:**

- **Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).
- **npm**: npm (Node Package Manager) is included with Node.js.

**Setup Instructions:**

1.  **Clone the Repository (if applicable):**
    If you've downloaded this as a ZIP, extract it. Otherwise, clone the repository:

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies:**
    Open your terminal in the project's root directory and run the following command to install all the necessary packages:

    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    You'll need to configure your API keys and other settings.

    - Create a new file named `.env.local` in the root of your project directory.
    - Open `.env.local` and add the following content:

      ```env
      GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
      IMAGE_GENERATION_ENABLED=disabled
      ```

    - **Replace `YOUR_GEMINI_API_KEY_HERE`** with your actual Google Gemini API key.
    - **`IMAGE_GENERATION_ENABLED`**:
      - Set to `enabled` if you have Imagen access and wish to use AI-generated images.
      - Set to `disabled` to run the game without image generation.

4.  **Run the Application:**
    Once the dependencies are installed and your environment variables are set, start the development server:
    ```bash
    npm run dev
    ```
    This will typically start the application on `http://localhost:3000` (or another port if specified in your project configuration). Open this URL in your web browser to begin your journey!

## Contributing

Contributions are welcome! If you have suggestions for improvements or want to contribute to the codebase, please feel free to open an issue or submit a pull request.

## License

[AGPL](/LICENSE)
