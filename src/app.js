import {Spinner} from "./components/spinner";
import {Step} from "./components/step";
import {useStatus} from "./queries/useStatus";
import useInterval from 'react-useinterval';
import {useQueryClient} from "react-query";
import {useTurnOn} from "./mutations/turn-on";
import {useTurnOff} from "./mutations/turn-off";
import {useState} from "react";
import {StepContainer} from "./components/step-container";
import {Button} from "./components/button";
import {Badge} from "./components/badge";

function App() {
    const queryClient = useQueryClient()
    const status = useStatus();
    const turnOn = useTurnOn();
    const turnOff = useTurnOff();
    const [lastRequest, setLastRequest] = useState(0);
    const [requesting, setRequesting] = useState(false);

    const {
        stackStatus,
        serverState,
        players,
        registeredContainerInstancesCount,
        clusterRunningTasks
    } = status?.data?.data ?? {}

    const cluster = registeredContainerInstancesCount >= 1;
    const task = clusterRunningTasks >= 1;
    const stackStable = stackStatus === 'UPDATE_COMPLETE';

    const stopped = serverState === 'Stopped';
    const running = serverState === 'Running';

    // Server is online when it's responding and server state is running
    const online = players !== null && running;
    // Server is offline nothing is happening
    const offline = stackStable && stopped && !task && !cluster;
    // Booting when server state is running but server is not yet responding
    const booting = !online && running;
    // Draining when server state is stopped, but something is happening
    const draining = stopped && (!stackStable || task || cluster);

    useInterval(refreshStatus, booting ? 5000 : 60000);
    useInterval(refreshRequesting, 1000);

    function recentlyRequested() {
        return Date.now() - lastRequest < 30000
    }

    function refreshStatus() {
        queryClient.invalidateQueries('status');
    }

    function refreshRequesting() {
        setRequesting(recentlyRequested());
    }

    async function requestTurnOn() {
        if (recentlyRequested()) {
            return;
        }

        setLastRequest(Date.now());
        refreshRequesting()
        await turnOn.mutateAsync();
    }

    async function requestTurnOff() {
        if (recentlyRequested()) {
            return;
        }

        setLastRequest(Date.now());
        refreshRequesting()
        await turnOff.mutateAsync();
    }

    return (
        <div className="flex flex-col items-center space-y-8 pt-8">
            <h1 className="text-5xl text-white tracking-tighter font-mono font-bold select-all">
                minecraft.aws.hugo.dev.br
            </h1>

            {/* Loading */}
            {!status.data && <Spinner/>}

            {/* Offline badge */}
            {(offline || draining) && <Badge color="red" loading={stackStable}>
                <span>OFFLINE</span>
            </Badge>}

            {/* Online badge */}
            {online && <Badge color="green" loading={stackStable}>
                <span>ONLINE: {players} players</span>
            </Badge>}

            {/* Loading state */}
            {booting && <Button
                disabled
                loading
            >
                Iniciando...
            </Button>}

            {/* Start button */}
            {(offline && !requesting) && <Button
                onClick={() => requestTurnOn()}
                loading={requesting}
            >
                Iniciar
            </Button>}

            {/* Off button */}
            {online && <Button
                loading={requesting}
                onClick={() => requestTurnOff()}
            >
                Desligar
            </Button>}

            {/* Starting steps */}
            {booting && <StepContainer>
                <Step
                    task="Atualizando stack"
                    finished="Stack atualizada"
                    done={stackStable}
                />
                <Step
                    task="Aguardando cluster"
                    finished="Cluster online"
                    done={cluster}
                />
                <Step
                    task="Iniciando container"
                    finished="Container online"
                    done={task}
                />
                <Step
                    task="Aguardando resposta"
                    finished="Pronto para conexão"
                    done={online}
                />
            </StepContainer>}

            {/* Draining steps */}
            {draining && <StepContainer>
                <Step
                    task="Atualizando stack"
                    finished="Stack atualizada"
                    done={stackStable}
                />
                <Step
                    task="Encerrando servidor"
                    finished="Servidor encerrado"
                    done={!online}
                />
                <Step
                    task="Finalizando instância"
                    finished="Instância finalizada"
                    done={!task}
                />
                <Step
                    task="Drenando cluster"
                    finished="Cluster drenado"
                    done={!cluster}
                />
            </StepContainer>}
        </div>
    );
}

export default App;
