import React from 'react';


const Provision = React.memo(({ }) => {
    return (
        <div>
            <h1 className='text-center'>Provision Azure Digital Twin</h1>
            <a
                href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Flucadruda%2Fiotc-indoor-maps%2Findoor_maps%2Fsetup%2Fsrc%2Fazure%2Fazuredeploy.json"
                target="_blank"
                rel="noreferrer"
            >
                <div>
                    <img src="https://aka.ms/deploytoazurebutton" alt="Deploy to Azure" />
                </div>
            </a>

        </div >
    );
}
);

export default Provision;