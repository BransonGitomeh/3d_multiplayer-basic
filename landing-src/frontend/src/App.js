import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import Select from 'react-select';
import axios from 'axios';

const API_URL = "http://localhost:3001"

const possibleDeposits = [1, 5, 10, 50, 100, 500];

const SinglePlatform = () => {
  const [balance, setBalance] = useState(0);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [userReadyToContinue, setUserReadyToContinue] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedProfileJobs, setSelectedProfileJobs] = useState([]);

  const { profileId } = useParams();

  useEffect(() => {
    axios.get(`${API_URL}/profile/${profileId}`, {
      params: { type: 'contractor' },
      headers: { 'User-Agent': 'insomnia/8.4.2', profile_id: profileId },
    })
      .then((response) => {
        const selectedProfile = response.data
        setSelectedProfile(selectedProfile);
        setBalance(selectedProfile.balance)
      })
      .catch((error) => {
        console.error(error);
      });

    const fetchProfiles = axios.get(`${API_URL}/profiles`, {
      params: { type: 'contractor' },
      headers: { 'User-Agent': 'insomnia/8.4.2', profile_id: profileId },
    });

    fetchProfiles.then(({ data: profilesResponse }) => {
      setAvailableProfiles(profilesResponse);
    })
      .catch((error) => {
        console.error(error);
      });

  }, [profileId]);



  const handleDownload = async (platform) => {
    try {
      const versionMap = {
        'Mac': {
          versionName: "MacBuildV3",
          path: "/executables/mac/index.exe"
        },
        'Windows': {
          versionName: "WindowsBuildV1",
          path:"/executables/windows/index.exe"
        },
        'Linux': {
          versionName: "LinuxBuildV5",
          path: "/executables/linux/index.apk"
        },
        'Android': {
          versionName: "AndroidBuildV5",
          path: "/executables/android/index.apk"
        }
      };

      // Assuming the response contains the download URL
      const downloadUrl = versionMap[platform].path

      console.log(downloadUrl)

      // Generate a unique timestamp or version number
      const version = versionMap[platform].versionName + "__" + Date.now(); // You can use a more sophisticated versioning strategy if needed

      // Extract the file extension from the download URL
      const fileExtension = downloadUrl.split('.').pop();

      // Construct the desired file name with versioning
      const fileName = `Multiplayer_Experience_Test_${version}.${fileExtension}`;

      // Triggering file download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank'; // Open in a new tab/window if needed
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
    } catch (error) {
      alert(`Error processing your deposit. ${error.response.data.error}`);
    }
  };


  const handleContractorSelection = (selectedOption) => {
    setSelectedContractor(selectedOption);
    setUserReadyToContinue(false);

    axios.get(`${API_URL}/jobs/unpaid`, {
      params: {
        contractor_id: selectedOption.value,
      },
      headers: {
        'User-Agent': 'insomnia/8.4.2',
        profile_id: profileId
      },
    })
      .then((response) => {
        setSelectedProfileJobs(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const handlePayJob = async (job) => {
    const endpoint = `${API_URL}/jobs/${job.id}/pay`;

    const headers = new Headers({
      profile_id: profileId
    });

    const amount = job.price;

    try {
      const response = await axios.post(endpoint, {
        amount
      }, {
        headers: {
          'Content-Type': 'application/json',
          profile_id: profileId,
        },
      });

      if (response.status == 200) {

        setBalance((prevBalance) => prevBalance - job.price);
      } else {

        alert('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error making payment:', error.response.data.error);
      alert(`An error occurred while processing the payment. ${error.response.data.error}`);
    }
  };


  const handleContinue = () => {
    setUserReadyToContinue(true);
  };

  const { platform } = useParams();

  return (
    <div className='container px-4 py-5'>

      {/* {selectedProfile && <p>Selected Client: <b>{selectedProfile.firstName} {selectedProfile.lastName}</b></p>} */}
      {/* <p>Balance: <b>${balance}</b></p> */}

      <div className='mb-5'>
        {/* <p>Select your download type bellow:</p> */}
        <button className='btn btn-primary' onClick={() => handleDownload(platform)}>
          Download {platform} Executable
        </button>
      </div>

      <div className='mb-5'>
        {selectedContractor && (
          <div>
            {/* <p>Selected Contractor: {selectedContractor.label}</p> */}
            <button className='btn btn-primary btn-lg px-4' onClick={handleContinue}>Continue</button>
          </div>
        )}
      </div>



      {userReadyToContinue && selectedContractor && (
        <div>
          <h3>Jobs for {selectedContractor.label}</h3>
          <ul>
            {selectedProfileJobs.length == 0
              ? <p style={{ color: "red" }}>No jobs found for {selectedContractor.label}, please select another contractor</p>
              : selectedProfileJobs.map((job) => (
                <li key={job.id}>
                  {job.description} - ${job.price}{' '}
                  {!job.paid && <button className='btn btn-primary btn-sm px-4' onClick={() => handlePayJob(job)}>Pay</button>}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};



const AdminPage = () => {
  const [start, setStart] = useState(''); // Set default values if needed
  const [end, setEnd] = useState('');
  const [bestProfession, setBestProfession] = useState('');
  const [bestClients, setBestClients] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use Promise.all to run the requests in parallel
        const [bestProfessionResponse, bestClientsResponse] = await Promise.all([
          axios.get(`${API_URL}/admin/best-profession`, { params: { start, end } }),
          axios.get(`${API_URL}/admin/best-clients`, { params: { start, end } }),
        ]);

        setBestProfession(bestProfessionResponse.data.bestProfession);
        setBestClients(bestClientsResponse.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();

  }, [start, end]);

  const handleDateChange = (type, date) => {
    if (type === 'start') {
      setStart(date);
    } else {
      setEnd(date);
    }
  };

  return (
    <div className="admin-page container px-4 py-5">
      <h2>Admin Page</h2>
      <div className="date-pickers">
        <p>
          <label htmlFor="startDate">Start Date:</label>
          <input type="date" id="startDate" value={start} onChange={(e) => handleDateChange('start', e.target.value)} />
        </p>

        <p>
          <label htmlFor="endDate">End Date:</label>
          <input type="date" id="endDate" value={end} onChange={(e) => handleDateChange('end', e.target.value)} />
        </p>
      </div>

      <div className="admin-results">
        <p>Best Profession: <b>{bestProfession}</b></p>
        <h3>Best Clients:</h3>
        <ul>
          {bestClients && bestClients.map((client) => (
            <li key={client.id}>
              {client.fullName} - Paid: {client.paid}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};


const Login = () => {
  const [selectedProfile, setSelectedProfile] = useState('');
  const [profiles, setProfiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/profiles`, {
      params: { type: 'client' },
      headers: { 'User-Agent': 'insomnia/8.4.2', profile_id: '1' },
    })
      .then((response) => {
        setProfiles(response.data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const handleProfileChange = (event) => {
    const selectedProfileId = event.target.value;
    const selectedProfileObject = profiles.find((profile) => profile.id === parseInt(selectedProfileId));

    setSelectedProfile(selectedProfileObject);
  };


  const handleLogin = () => {
    if (selectedProfile) {
      navigate(`/${selectedProfile.id}`);
    }
  };

  return (
    <div className="container px-4 py-5">
      <form>
        <div className="form-group">
          <div className='mb-5'>
            <select
              id="profileDropdown"
              value={selectedProfile.id || ''}
              onChange={handleProfileChange}
              className='form-select'
            >
              <option value="">Select a client profile</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {`${profile.firstName} ${profile.lastName} - ${profile.profession} (${profile.balance} balance)`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleLogin}>
          Login
        </button>
      </form>
    </div>
  );
};

const GodotGame = () => {
  const iframeStyle = {
    width: '100%',
    height: '100vh', // Adjust the height as needed
    border: 'none', // Remove border for a cleaner look
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    boxShadow: '0 0 15px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'transform 0.3s ease-in-out',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  };

  return (
    <div className="container-fluid" id="navbarSupportedContent">
      <iframe
        title="Godot Game"
        src="https://poetic-seahorse-6d47f2.netlify.app/"
        style={iframeStyle}
      ></iframe>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav className="navbar navbar-expand-lg bg-body-tertiary">
            <div className="container-fluid">
              <Link className="navbar-brand" to="/">Multiplayer Experience Test</Link>
              <button
                className="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarSupportedContent"
                aria-controls="navbarSupportedContent"
                aria-expanded="false"
                aria-label="Toggle navigation"
              >
                <span className="navbar-toggler-icon" />
              </button>
              <div className="collapse navbar-collapse" id="navbarSupportedContent">
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                  <li className="nav-item">
                    <Link className="nav-link active" aria-current="page" to="/">Web</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link active" aria-current="page" to="/Windows">Windows</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link active" aria-current="page" to="/Mac">Mac</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link active" aria-current="page" to="/Linux">Linux</Link>
                  </li>
                  {/* <li className="nav-item">
                    <Link className="nav-link" to="/admin">Admin</Link>
                  </li> */}

                </ul>

              </div>
            </div>
          </nav>


        </header>

        <Routes>
          <Route path="/" element={<GodotGame />} />
          <Route path="/:platform" element={<SinglePlatform />} />
          {/* <Route path="/admin" element={<AdminPage />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
