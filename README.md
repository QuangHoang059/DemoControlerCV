# DemoControlerCV

This project is a demonstration of a Computer Vision (CV) application. It includes a Flask server that receives image requests and a client that captures images to control a 3D model.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js
- Flask

### Installation

First, clone the repository to your local machine:

```bash
git clone https://github.com/QuangHoang059/DemoControlerCV.git
```

Navigate to the project directory:

```bash
cd DemoControlerCV
```

Install the necessary packages:

```bash
npm install
```

### Running the Application

To start flask server with port 50001

```bash
cd server
pip install -r requirements.txt
python main.py
```

To start the application, use the following command:

```bash
npm run start
```

This will start both the Flask server and the client.

## Usage

The client captures images and sends them to the Flask server. The server processes these images and uses them to control a 3D model.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
