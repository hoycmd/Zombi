import { DisplayValueHeader } from 'pixel_combats/basic';
import { Game, Players, Inventory, LeaderBoard, BuildBlocksSet, Teams, Damage, BreackGraph, Ui, Map, Properties, GameMode, Spawns, Timers, TeamsBalancer, NewGame, NewGameVote, contextedProperties } from 'pixel_combats/room';

// константы
const WaitingPlayersTime = 10;
const DefBaseFromZombies = 50;
const GameModeTime = 300;
const End0fMatchTime = 5;
const KILL_SCORES = 15;
const WINNER_SCORES = 35;
const TIMER_SCORES = 5;
const SCORES_TIMER_INTERVAL = 25;

// имена используемых объектов 
const WaitingStateValue = "Waiting";
const DefBaseStateValue = "DefBase";
const GameStateValue = "Game";
const End0fMatchStateValue = "End0fMatch";
const immortlityTimerName = "immortlity";
const KILL_PROP_NAME = "Kills";
const SCORES_PROP_NAME = "Scores";
const gamemodeParameters = GameMode.Parameters;

// получаем объекты, с которыми работает режим
const mainTimer = Timers.GetContext().Get("Main");
const stateProp = Properties.GetContext().Get("State");
const scoresTimer = Timers.GetContext().Get(SCORES_PROP_NAME);

// применяем параметры конструктора режима
const MAP_ROTATION = gamemodeParameters.GetBool("MapRotation");
Damage.GetContext().FriendlyFire.Value = gamemodeParameters.GetBool("FriendlyFire");
BreackGraph.OnlyPlayerBlocksDmg = gamemodeParameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = gamemodeParameters.GetBool("LoosenBlocks");
Map.Rotation = MAP_ROTATION;

// опции
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// создаем стандартные команды
const blueTeam = default_teams.CreateNewArea("Blue", "\nЛюди", new Color(0, 0, 125/255, 0), 1, BuildBlocksSet.Blue);
const zombieTeam = default_teams.CreateNewArea("Red", "\nЗомби", new Color(0, 125/255, 0, 0), 1, BuildBlocksSet.Red);
zombieTeam.Spawns.RespawnTime.Value = 10;
zombieTeam.contextedProperties.SkinType.Value = 1;

// настраиваем параметры, которые нужно выводить в лидерборде
LeaberBoard.PlayerLeaberBoardValues = [
 new DisplayValueHeader('Kills', '
