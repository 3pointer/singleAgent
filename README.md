# SingleAgent

SingleAgent is a chatbot and command-execution agent that provides an interactive user experience. 

## Features

- **Chatbot Agent:** Engage in natural language conversations.
- **Command Execution:** Execute shell commands via an integrated terminal.
- **Robust Backend:**
  - **DB:** TiDB for scalable, distributed storage, to store chat messges, execute history.
  - **RAG:** Elasticsearch (ES) for retrieval-augmented generation.
- **Modern Frontend:** Built with Next.js and integrated with the Vercel AI SDK.

## Architecture

### Backend

- **TiDB:** A distributed SQL database for reliable and scalable data storage.
- **Elasticsearch (ES):** Powers Retrieval-Augmented Generation (RAG) to fetch contextually relevant data.
- **Command Execution:** An agent runs commands on a Docker container and streams the output.

### Frontend

- **Next.js:** Provides server-side rendering and a modern React-based interface.
- **Vercel AI SDK:** Integrates advanced AI functionalities into the application.
- **Chat Interface & Integrated Terminal:** Users interact with the chatbot and execute commands via an embedded terminal.

## Setup and Installation

### Prerequisites

- **Node.js** (v14 or later)
- **TiDB instance** (or a local development version)
- **Elasticsearch instance** for RAG (Optional)
- **Docker** (for command execution)

### Installation Steps

#### 1. Clone the repository:

```bash
git clone https://github.com/yourusername/singleAgent.git
cd singleAgent
```

#### 2. Install dependencies:

```bash
pnpm install
```

#### 3. Configure environment variables:

Create a file named `.env` in the root directory and add the following (customize as needed):
```env
# Database configuration
DB_HOST="your-tidb-host"    # Database host address
DB_PORT=4000                # Database port
DB_USER="root"              # Database username
DB_PASSWORD=""              # Database password
DB_NAME="test"              # Name of the database

# LLM configuration
OPENAI_API_KEY="your-openai-key"
OPENAI_BASE_URL="https://api.openai.com/v1"

# Docker execution configuration
DOCKER_CONTAINER="your-container-id"   # Actual Docker container name
DOCKER_SHELL=sh                        # Default shell inside the container

# RAG API configuration(Optional)
RAG_API_KEY="xxx"      # API key for RAG service
RAG_API_ADDR=":9200"   # RAG API endpoint
```

#### 4. Run the development server:
```bash
pnpm run dev
```
if run dev not work, you may run below command to apply db schema changes
```bash
pnpm run db:generate
pnpm run db:migrate
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Submit a pull request with a detailed description of your changes.

