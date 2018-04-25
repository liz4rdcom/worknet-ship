set fullpath=%1

cd %fullpath%

call forever stop "worknet"
call forever start --id "worknet" app.js

call node seedtestdata.js
call node seedtestuser.js
