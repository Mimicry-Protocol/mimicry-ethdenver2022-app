#!/bin/bash

node publish build -t && node publish deploy -y -n local --add-new-synths --ignore-safety-checks --fresh-deploy && cd publish && python gen_interface_file.py && cd ../../react-app && yarn start
