# FlowGo Traffic AI - Project Structure

```
SIH/
├── docs/                          # All documentation
│   ├── setup/                     # Setup guides
│   │   ├── SETUP_INSTRUCTIONS.md
│   │   └── PROJECT_SETUP_COMPLETE.md
│   ├── guides/                    # Feature guides
│   │   ├── AUTH_SYSTEM_GUIDE.md
│   │   ├── CAMERA_CREDENTIALS_GUIDE.md
│   │   ├── STREAMING_USAGE.md
│   │   ├── STREAMING_COMPARISON.md
│   │   └── STREAMING_OLD_USAGE.md
│   ├── integration/               # Integration docs
│   │   ├── INTEGRATION_GUIDE.md
│   │   ├── BACKEND_SETUP.md
│   │   └── RUN_SYSTEM.md
│   └── requirements/              # Requirements docs
│       ├── REQUIREMENTS_COMPLIANCE.md
│       ├── REQUIREMENTS_SATISFACTION_CHECKLIST.md
│       ├── PROBLEM_SOLUTION_ALIGNMENT.md
│       └── SYSTEM_VERIFICATION_COMPLETE.md
│
├── scripts/                       # All startup scripts
│   ├── start_flowgo.ps1          # Windows master startup
│   ├── start_flowgo.sh            # Linux/Mac master startup
│   ├── start_all.ps1              # Alternative Windows script
│   └── start_all.sh               # Alternative Linux/Mac script
│
├── rl/                            # Backend & RL Components
│   ├── core/                      # Core RL components
│   │   ├── data_collector_env.py
│   │   ├── train_rl.py
│   │   ├── evaluate.py
│   │   └── demonstrate_improvement.py
│   ├── data/                      # Data processing
│   │   ├── dataset_generator.py
│   │   ├── generate_routes.py
│   │   └── data/
│   │       └── cctv/              # Video files
│   ├── api/                       # API components
│   │   ├── monitoring_server.py
│   │   ├── auth_system.py
│   │   ├── live_prediction_api.py
│   │   └── test_prediction_api.py
│   ├── utils/                     # Utility scripts
│   │   ├── camera_config_loader.py
│   │   ├── iot_sensor_simulator.py
│   │   ├── verify_requirements.py
│   │   ├── streaming_old.py
│   │   └── streaming_new.py
│   ├── config/                    # Configuration files
│   │   ├── camera_config.example.json
│   │   └── camera_config.json     # (gitignored)
│   ├── nets/                      # SUMO network files
│   │   ├── city.net.xml
│   │   ├── city.sumocfg
│   │   └── simple_intersection.net.xml
│   ├── routes/                    # SUMO route files
│   │   ├── city.rou.xml
│   │   └── city.rou.json
│   ├── datasets/                  # Generated datasets
│   │   └── cctv_counts_*.csv
│   ├── models/                    # Trained RL models
│   │   ├── dqn_sumo.zip
│   │   └── best_model.zip
│   ├── artifacts/                 # Runtime artifacts
│   │   ├── monitoring.json
│   │   ├── users.json             # User database
│   │   ├── verifications.json     # Verification codes
│   │   └── logs/                  # Training logs
│   │       ├── transitions.csv
│   │       └── heatmap.json
│   ├── requirements.txt
│   └── README.md
│
├── frontend/                      # React Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/         # Dashboard components
│   │   │   ├── ui/                # UI components
│   │   │   └── ...
│   │   ├── pages/                 # Page components
│   │   ├── hooks/                 # React hooks
│   │   ├── lib/                   # Utilities
│   │   └── types/                 # TypeScript types
│   ├── public/                    # Static assets
│   ├── package.json
│   └── README.md
│
├── README.md                      # Main project README
├── PROJECT_STRUCTURE.md           # This file
└── .gitignore                     # Git ignore rules
```

