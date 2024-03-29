import React from 'react';
import {Grid, GridItem, Icon, TextField, Button, NerdGraphQuery,Spinner,BarChart,LineChart,NrqlQuery,Tabs,TabsItem,AccountsQuery, ChartGroup, DropdownItem, Dropdown} from 'nr1'

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

export default class FacinatorNerdletNerdlet extends React.Component {

    constructor(props) {
        super(props);
        AccountsQuery.query().then(({ data }) => {
            this.setState({
                formData: {
                    accountId: (data.length > 0) ? data[0].id+"" : "1",
                    query: "from Transaction since 10 minutes ago",
                    exclude: "timestamp,another_facet",
                    threshold: "50",
                    bucketSize: "auto",
                    aggregator: "count(*)",
                    numFacets: "20",
                    exploreAggregator: "average($FIELD$)",
                    exploreFacets: ""

                },
                currentData: {},
                loading: false,
                summaryLoading: true,
                hideDisabled: true
            })
        })


        this.formSubmit = this.formSubmit.bind(this);
        this.loadFacetData = this.loadFacetData.bind(this)


    }

    formSubmit(e) {
        e.preventDefault()
        this.setState({loading:true,summaryLoading: true, facetSummaryData: false})
        this.loadFacetData()
    }

    handleChange(field,value){

        let fdata=this.state.formData;
        fdata[field]=value
        this.setState({
            formData: fdata
        });
    }

    loadFacetData() {
        const { formData } = this.state
        const {accountId, query} = formData

        const variables = {
            id: Number(accountId)
        }

        let nrql= `SELECT count(*) as records,keyset() as keyset ${query}`
        
        let gquery = `
            query($id: Int!) {
                actor {
                    account(id: $id) {
                        facetData: nrql(query: "${nrql}" ) {results}
                    }
                }
            }
        `

        const q = NerdGraphQuery.query({ query: gquery, variables: variables });
        q.then(results => {
            console.log("results",results)
            let currentData={...formData}
            currentData.exclude=",_GRANDTOTAL,"+currentData.exclude
            
            this.setState({loading:false, facetData: results.data.actor.account.facetData.results[0],
                currentData: {...currentData}},
            ()=>{this.loadFacetDetail()}    
            )
            
            
        }).catch((error) => { console.log(error); })
    
    }

    loadFacetDetail() {
    
        const { formData,facetData } = this.state
        const { accountId, query } = formData

        const fdata = facetData
        const variables = {
            id: Number(accountId)
        }

        let nrql="select count(*) as '_GRANDTOTAL'"
        
        fdata.allKeys.forEach((facet,idx)=>{
            
            nrql+=`, filter(count(\`${facet}\`), where \`${facet}\` is not null) as '${facet}', filter(uniqueCount(\`${facet}\`), where \`${facet}\` is not null) as '${facet}--groups'`
        })
        

        let graphqlQuery = `
        query {
            actor {
                account(id: ${accountId}) {
                    facetSummary: nrql(query: "${nrql} ${query}") {results}
                }  
            }
        }`
        
        const q = NerdGraphQuery.query({ query: graphqlQuery, variables: variables });
        q.then(results => {
            this.setState({summaryLoading:false, facetSummaryData: results.data.actor.account.facetSummary.results[0]})
        }).catch((error) => { console.log(error); })
    
    }


    render() {
        if(this.state) {
        let { formData, loading, facetData, facetSummaryData, summaryLoading, currentData, hideDisabled, exploreAggregator, exploreFacets } = this.state
        


        let form = <div className="formSection">
                    {/* <form onSubmit={(this.formSubmit)}> */}
                    <form onSubmit={(e)=>{e.preventDefault()}} >
                        <h3>Data source</h3>
                         <hr />
                        <h4>Query</h4>
                        <p className="fieldExplanation">Specify an NRQL query but omit the <strong>SELECT</strong> keyword and any <strong>TIMESERIES</strong> or <strong>FACET</strong> clauses. You can filter using <strong>WHERE</strong> and <strong>SINCE</strong> clauses as usual to reduce the data being examined.</p>
                        <br />For Example: <pre>from Transaction where appName='MyAppName'</pre>
                        <TextField className="fullWidthInput" 
                            value={formData.query}
                            onChange={(e)=>{this.handleChange('query',e.target.value)}}
                        />
                        
                        <h4>Aggregator function</h4>
                        <p className="fieldExplanation">The aggregator function is the function used to plot the facet charted in the details tab. By default this is count(*) but you could use another function such as percentile(duration,90). You may supply more than one aggretor function, sereperated by commas just as you would i nthe NRQL query.</p>
                        <TextField className="fullWidthInput" 
                            value={formData.aggregator}
                            onChange={(e)=>{this.handleChange('aggregator',e.target.value)}}
                        />
                        
                        <h4>Account ID</h4>
                        <p className="fieldExplanation">The account ID will be populated automatically. If you have access to more than one account you may need t supply the right one here.</p>
                        <TextField className="fullWidthInput" 
                            value={formData.accountId}
                            onChange={(e)=>{this.handleChange('accountId',e.target.value)}}
                        />
                         
                        <h4>Facet render threshold</h4> 
                        <p className="fieldExplanation">This threshold determines how many unique values of a given facet are allowed before the chart is skipped.  For example if the threshold is 50 then if a facet returns more than 50 unique values it will not render in the details pane. You can also toggle this using the 'show disabled facets' at the bottom.</p>
                        <TextField className="fullWidthInput" 
                            value={formData.threshold}
                            onChange={(e)=>{this.handleChange('threshold',e.target.value)}}
                        />
                         
                        <br /><br />
                        <h3 className="midFormh3">Explore settings</h3>
                        <hr />
                        <div className="formIntro">These settings affect the 'Explore' tab only.</div>
                        <br />

                        <h4>Explore tab aggregator function</h4>
                        <p className="fieldExplanation">The explore tab will display each using the aggregator function(s) defined here applied. Use the token $FIELD$ to represent the current facet. You may supply further facets to facet by aswell.</p>
                        <br />For Example: <pre>average($FIELD$)</pre>
                        <TextField className="fullWidthInput" 
                            value={formData.exploreAggregator}
                            onChange={(e)=>{this.handleChange('exploreAggregator',e.target.value)}}
                            placeholder="e.g average($FIELD$)"
                        />

                        <h4>Explore facets</h4>
                        <p className="fieldExplanation">Provide the facets you wish to facet by. Comma seperated.</p>
                        <TextField className="fullWidthInput" 
                            value={formData.exploreFacets}
                            onChange={(e)=>{this.handleChange('exploreFacets',e.target.value)}}
                            placeholder="e.g appName"
                        />
                        <br /><br />
                        <h3  className="midFormh3">Optional settings</h3>
                        <hr />
                        <div className="formIntro">Some additional configuration options.</div>
                        <h4>Exclude facets</h4>
                        <p className="fieldExplanation">A comma seperated of facets to exclude</p>
                        <TextField className="fullWidthInput" 
                            value={formData.exclude}
                            onChange={(e)=>{this.handleChange('exclude',e.target.value)}}
                        />
                        
                        <h4>Bucket size</h4>
                        <p className="fieldExplanation">The size of the buckets on the line charts.</p>
                        <TextField className="fullWidthInput" 
                            value={formData.bucketSize}
                            onChange={(e)=>{this.handleChange('bucketSize',e.target.value)}}
                        />


                        <h4>Facets per chart</h4>
                        <p className="fieldExplanation">The number of facets to include on charts.</p>
                        <TextField className="fullWidthInput" 
                            value={formData.numFacets}
                            onChange={(e)=>{this.handleChange('numFacets',e.target.value)}}
                        />
       
                        <div className="analyseButton">
                            <Button onClick={(this.formSubmit)}iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__SEARCH} type={Button.TYPE.PRIMARY}>Analyse</Button>
                        </div>
                    </form>
        </div>

        let results= !loading ? <div className="loader">&nbsp;</div> : <div className="loader"><Spinner inline /> Loading facets...</div>

        let detailRows= <div className="dataWaiting">Specify the data you wish to explore and press Analyse.</div>
        let exploreRows=detailRows
        if(!loading && facetData && currentData) {
            let {query, exclude,  threshold, bucketSize, aggregator, numFacets, accountId, exploreAggregator, exploreFacets} = currentData
   

            let totalSummary=""
            let totalRecords = 0
            let facetSummary = <div className="loader"><Spinner inline /> Loading facet detail...</div>
            if(!summaryLoading && facetSummaryData) {

                totalRecords = facetSummaryData["_GRANDTOTAL"]
                
                
                totalSummary=<div className="totalsTable">
                    <h3>Summary</h3>
                    <table >
                    <tbody>
                    <tr><th>Total records:</th><td>{totalRecords}</td></tr>
                    <tr><th>Total facets:</th><td>{facetData.allKeys.length}</td></tr>
                    </tbody>
                </table>
                </div>

                let facetKeys=Object.keys(facetSummaryData)
                facetKeys=facetKeys.sort((a,b)=>{return a.toLowerCase() > b.toLowerCase() ? 1 : -1})
                
                let facetSummaryRows = facetKeys.map((facet,idx)=>{
                    let className= (exclude.search(","+facet)>= 0) ? "removed" : "enabled"
                    if(facet.search("--groups") < 0 ) {

                    if(facetSummaryData[facet+"--groups"] > Number(threshold) && threshold!="0" && threshold!="max") { className="disabled"}

                    let percent = (facetSummaryData[facet] / totalRecords) * 100
                    let barWidth=  percent * (100/100)

                    let barColour = (className=="disabled") ? "#9d97977a" : "#66ccff7a"

                    className= (className=="disabled" && hideDisabled) ? "removed" : className
                    if(className!=='removed') {
                        return <tr key={idx} className={className}>
                            <td><a href={`#${facet}`}>{facet}</a></td>
                            <td>{facetSummaryData[facet+"--groups"]}</td>
                            <td>{facetSummaryData[facet]}</td>
                            <td>{percent.toFixed(0)}%</td>
                            <td style={{textDecoration: "none"}}>
                                <div style={{width: 2+100, backgroundColor:"#d4d4d47a", textDecoration: "none"}}>
                                <div style={{width: 2+barWidth, backgroundColor:barColour, textDecoration: "none"}} >&nbsp;</div>
                                </div>
                            </td>
                                
                        </tr>
                    }
                    }
                })

                let hideButtonText=hideDisabled ?  "Show disabled facets" : "Hide disabled facets"
                facetSummary=<div className="facetsTable">
                    <h3>Facet Breakdown</h3>
                    
                    <table>
                    <thead>
                    <tr><th>Facet</th><th>Groups</th><th>Records</th><th colSpan={2}>Coverage %</th></tr>
                    </thead>
                    <tbody>
                    {facetSummaryRows}
                    </tbody>
                </table>
                <div className="facetsTableNote">Facets are disabled and not rendered on the right if the number of groups is above the set threshold. Change the threshold or click this magic button to view them all:</div>
                <Button onClick={()=>{this.setState({hideDisabled:!hideDisabled})}}>{hideButtonText}</Button>
                </div>

            }

            results=<>
            {totalSummary}
            {facetSummary}
            </>

            let facetKeys=Object.keys(facetSummaryData)
            if(facetKeys && facetKeys.length > 0) {
                facetKeys=facetKeys.sort((a,b)=>{return a.toLowerCase() > b.toLowerCase() ? 1 : -1})
                //DETAILS-------------------------------------------
                detailRows = facetKeys.map((facet,idx)=>{
                    if(facet.search("--groups") < 0 ) {
                    let percent = (facetSummaryData[facet] / totalRecords) * 100
                    
                    if(exclude.search(","+facet)== -1 && (facetSummaryData[facet+"--groups"] <= threshold) || !hideDisabled) {

                        let graphquery=`SELECT ${aggregator} ${query} facet \`${facet}\` timeseries ${bucketSize} limit ${numFacets}`
                        let tablemax =  numFacets > 50 ? numFacets : 50



                        let graphPanel=<Grid>
                            <GridItem columnSpan={5}>

                            <NrqlQuery formatType={NrqlQuery.FORMAT_TYPE.RAW} accountId={Number(currentData.accountId)} query={`SELECT uniqueCount(\`${facet}\`) as 'Facet groups', ${aggregator} as '${aggregator}' ${query} where \`${facet}\` is not null`}>
                            {({ data }) => {
                                if (data) {
                                    // change colors to a nice pink.
                                return <div className="facetDetailGroupSummary">
                                    <span className="tinyLabel">Facet Groups</span><span className="largerLabel">{data.results[0].uniqueCount}</span>
                                    <span className="tinyLabel">Overall {aggregator}</span><span className="largerLabel">{data.results[1].count}</span>
                                </div>
                                } else {
                                    return <div><Spinner inline/> </div>
                                }

                            
                            }}
                            </NrqlQuery>
                            <hr />
                                <BarChart fullWidth fullHeight style={{height:"22em"}}
                                    accountId={Number(accountId)}
                                    query={`SELECT count(*) ${query} facet \`${facet}\` limit ${tablemax}`}
                                />
                            </GridItem>
                        
                            <GridItem columnSpan={7}>
                                <LineChart fullWidth fullHeight 
                                    accountId={Number(accountId)}
                                    query={graphquery}
                                />
                            </GridItem>
                        </Grid>
                        

                        return <div key={idx} className="detailRow">
                            <h3 id={facet} ><Icon type={Icon.TYPE.DATAVIZ__DATAVIZ__DASHBOARD} /> {facet} 
                            <span className="tinyLabel">records</span>{facetSummaryData[facet]}  
                            <span className="tinyLabel">coverage</span>{percent.toFixed(2)}%</h3>
                            <pre>{graphquery}</pre>
                            {graphPanel}
                            </div>
                        
                    }
                }
                })

                //Explore-------------------------------------------

                exploreRows = facetKeys.map((facet,idx)=>{
                    if(facet.search("--groups") < 0 ) {
                    let percent = (facetSummaryData[facet] / totalRecords) * 100
                    if(exclude.search(","+facet)== -1 && (facetSummaryData[facet+"--groups"] <= threshold) || !hideDisabled) {


                        let aggregatorFn= exploreAggregator.replace(/\$FIELD\$/g, facet);
                        let facetFn=(exploreFacets && exploreFacets.length>0) ? `facet ${exploreFacets}` : ""
                        let graphquery=`SELECT ${aggregatorFn} ${query} timeseries ${bucketSize} ${facetFn} limit ${numFacets}`
                    

                        let graphPanel=<div style={{height:'250px'}}>
                                <LineChart fullWidth fullHeight 
                                    accountId={Number(accountId)}
                                    query={graphquery}
                                />
                        </div>
                        
                        

                        return <div key={idx} className="detailRow">
                            <h3 id={facet} ><Icon type={Icon.TYPE.DATAVIZ__DATAVIZ__DASHBOARD} /> {facet} 
                            <span className="tinyLabel">records</span>{facetSummaryData[facet]}  
                            <span className="tinyLabel">cardinality</span>{percent.toFixed(2)}%</h3>
                            <pre>{graphquery}</pre>
                            {graphPanel}
                            </div>
                        
                    }
                }
                })


            } else {
                detailRows=<div className="dataWaiting"><Spinner inline /> Waiting for facet data to load...</div>
                exploreRows=detailRows
            }




        }


        return <>
            <Grid>
                <GridItem columnSpan={4}>
                    {form}
                    {results}
                </GridItem>    
                <GridItem columnSpan={8}>
                <Tabs defaultValue="tab-1">
                        <TabsItem value="tab-1" label="Details">
                            <div className="tabbedPanel"><ChartGroup>{detailRows}</ChartGroup></div>
                        </TabsItem>
                        <TabsItem value="tab-2" label="Explore">
                        <div className="tabbedPanel">
                            Each of the facets is displayed using the aggregator function(s) specified in the explore settings.
                            <br /><br />
                            <ChartGroup>{exploreRows}</ChartGroup>
                        </div>
                        </TabsItem>
                </Tabs>
                </GridItem>
            </Grid>
        </>
    } else { return <div><Spinner inline /> Loading accounts...</div>}
    } 
}
