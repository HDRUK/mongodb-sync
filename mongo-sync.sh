#!/bin/bash

set -e           # exit on error
set -o pipefail  # trace ERR through pipes
set -o errtrace  # trace ERR through 'time command' and other functions
set -o errexit   # exit the script if any statement returns a non-true return value

trap 'error ${LINENO}' ERR

function usage_error {
    echo mongo-sync: "$1"
    echo "usage: PROD_URI=mongodb+srv://user:pwd@host/db LOCAL_URI=mongodb+srv://user:pwd@host/db LOCAL_DB=localdb COLLECTIONS=users,teams,tools"
    echo ""
    exit
}


function banner {
    echo mongo-sync:
    echo -----------
}

function success_msg {
    echo "Success!"
    echo
}

function done_msg {
    echo "Done!"
    echo
}

function check_config {
    if [[ ! $PROD_URI ]] 
    then
        echo "Provide a valid PROD_URI"
        exit;
    fi 
    if [[ ! $LOCAL_URI ]] 
    then
        echo "Provide a valid LOCAL_URI"
        exit;
    fi
    if [[ ! $LOCAL_DB ]] 
    then
        echo "Provide a valid LOCAL_DB"
        exit;
    fi 
    if [[ ! $COLLECTIONS=users ]] 
    then
        echo "Provide comma separated collection names"
        exit;
    fi       
   
  
}

function pull {
    banner
    check_config
  
    # declare -a collections=(`echo $COLLECTIONS | sed 's/,/\n/g'`)

    collections=($(echo "$COLLECTIONS" | tr ',' '\n'))


    for collection in "${collections[@]}"
    do
        echo "exporting $collection"
        mongoexport --uri=$PROD_URI --collection=$collection --out $collection.json
        
    done
    success_msg

    for collection in "${collections[@]}"
   
        do  
            if [ "$collection" != "teams" ]; then
                echo "importing $collection"
                mongoimport --uri=$LOCAL_URI --collection=$collection --file $collection.json --mode=merge
                rm -rf $collection.json
            fi  
        done
    success_msg

}


## MAIN
## ====


for ARGUMENT in "$@"
do
    KEY=$(echo $ARGUMENT | cut -f1 -d=)

    KEY_LENGTH=${#KEY}
    VALUE="${ARGUMENT:$KEY_LENGTH+1}"

    export "$KEY"="$VALUE"
done

if [[ $# -eq 0 ]] ; then
    usage_error "no arguments provided"
else
   pull
fi
