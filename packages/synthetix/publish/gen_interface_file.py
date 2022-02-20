import json
#import pprint
# read in initial file
with open("../../react-app/src/contracts/hardhat_contracts.json", "r") as fp:
    contracts_interface_file = json.load(fp)

# read in abi of deployed Mimicry file
with open("../build/compiled/Mimicry.json", "r") as fp:
    mimicry_abi = json.load(fp)
    
# read in abi of deployed Mimicry file
with open("../build/compiled/Synthetix.json", "r") as fp:
    synthetix_abi = json.load(fp)

mimicry_abi_interface = mimicry_abi['abi']
synthetix_abi_interface = synthetix_abi['abi']
# set the mimicry deployed abi to the abi in the FE interface file
contracts_interface_file['31337']['localhost']['contracts']['Synthetix'] = {}

#import pdb; pdb.set_trace()
contracts_interface_file['31337']['localhost']['contracts']['Synthetix']['abi'] = synthetix_abi_interface

with open("mimicry_deploy.json", "r") as fp:
    mimicry_deploy = json.load(fp)
    
with open("synthetix_deploy.json", "r") as fp:
    synthetix_deploy = json.load(fp)

# set the deployed address to the address field in the FE interface file
contracts_interface_file['31337']['localhost']['contracts']['Mimicry']['address'] = mimicry_deploy['address']
contracts_interface_file['31337']['localhost']['contracts']['Synthetix']['address'] = synthetix_deploy['address']

# write to disk
with open("../../react-app/src/contracts/hardhat_contracts.json", "w") as fp:
    json.dump(contracts_interface_file, fp)