import string
from urllib import request
import openai
openai.api_key = "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"

msg = '''
I'm investigating the root cause of the revenue metric change. All the key drivers a list below as a csv order by their impact.
Also I will provide a set of top driver for each dimensions as the csv format.

The data below are aggregated from the same table based on different dimensions, so different drivers could have overlap.

Help me draft a report for my team explaining the cause of the metric change. Group related values together. 

Output the result in markdown format.

Data:

"columns","column_values","base_period_size","comparison_period_size","previous_value","comparison_value","impact"
"user_gender","M","0.474609375","0.4847328244274809","14241.01000547409","16648.450012922287","2407.4400074481964"
"product_distribution_center_id","10","0.0703125","0.07824427480916031","1620.3399934768677","3051.0500049591064","1430.7100114822388"
"product_distribution_center_id","3","0.115234375","0.1717557251908397","4482.319991111755","5873.2299880981445","1390.9099969863892"
"user_gender|product_distribution_center_id","M|3","0.05078125","0.08587786259541985","1572.57998752594","2820.190004348755","1247.610016822815"
"category","Outerwear & Coats","0.048828125","0.05534351145038168","3388.2199897766113","4609.4400272369385","1221.2200374603271"
"user_gender|user_state","M|Jiangsu","0.009765625","0.02099236641221374","248.74000549316406","1467.3100032806396","1218.5699977874756"
"user_state","Jiangsu","0.017578125","0.02862595419847328","346.18000888824463","1542.3800048828125","1196.1999959945679"
"product_brand","Diesel","0.001953125","0.011450381679389313","55.950000762939446","1240.8999938964844","1184.949993133545"
"product_brand|user_gender","Diesel|M","0.001953125","0.011450381679389313","55.950000762939446","1240.8999938964844","1184.949993133545"
"product_brand|product_distribution_center_id","Diesel|10","0.001953125","0.011450381679389313","55.950000762939446","1240.8999938964844","1184.949993133545"
"product_brand|user_gender|product_distribution_center_id","Diesel|M|10","0.001953125","0.011450381679389313","55.950000762939446","1240.8999938964844","1184.949993133545"
"user_state","Shanghai","0.02734375","0.02099236641221374","469.1700019836426","1647.5700054168701","1178.4000034332275"
"user_gender|product_distribution_center_id","M|10","0.03515625","0.04961832061068702","1115.1599950790405","2180.989999771118","1065.8300046920776"
"category|user_state","Outerwear & Coats|Shanghai","0","0.003816793893129771","0","1045.6400146484375","1045.6400146484375"
"user_gender|user_state","M|Paraná","0","0.015267175572519083","0","971.429988861084","971.429988861084"
"user_state","Hebei","0.025390625","0.007633587786259542","1078.9500064849854","111.94000053405762","-967.0100059509277"
"category","Sweaters","0.05078125","0.061068702290076333","1781.490002632141","2747.670009613037","966.180006980896"
"user_gender|user_state","M|California","0.0234375","0.003816793893129771","1007.9799995422363","50.380001068115234","-957.5999984741211"
"user_state","Paraná","0.001953125","0.015267175572519083","18","971.429988861084","953.429988861084"
"category|user_gender","Sweaters|M","0.033203125","0.04007633587786259","1131.5099992752075","2070.640012741089","939.1300134658813"
"category","Suits & Sport Coats","0.0234375","0.03625954198473282","1506.6000061035156","2442.4899768829346","935.889970779419"
"category|user_gender","Suits & Sport Coats|M","0.0234375","0.03625954198473282","1506.6000061035156","2442.4899768829346","935.889970779419"
"category|user_gender","Jeans|F","0.0390625","0.01717557251908397","1876.0499954223633","982.4799995422363","-893.569995880127"
"user_state|product_distribution_center_id","Shanghai|10","0.00390625","0.007633587786259542","69.48999977111816","907.9799995422363","838.4899997711182"
"user_state","Mato Grosso","0.013671875","0","821.920000076294","0","-821.920000076294"
"user_gender|user_state","F|Mato Grosso","0.013671875","0","821.920000076294","0","-821.920000076294"
"user_state","England","0.048828125","0.02480916030534351","1344.8799896240234","530.3599948883057","-814.5199947357178"
"category|product_distribution_center_id","Outerwear & Coats|10","0","0.003816793893129771","0","790.5","790.5"
"category|user_gender|product_distribution_center_id","Outerwear & Coats|M|10","0","0.003816793893129771","0","790.5","790.5"
"user_gender|user_state|product_distribution_center_id","M|Shanghai|10","0.001953125","0.0057251908396946565","39.5","818.9799995422363","779.4799995422363"
"category|product_brand","Outerwear & Coats|Diesel","0","0.0019083969465648854","0","758","758"
"product_brand|user_state","Diesel|Shanghai","0","0.0019083969465648854","0","758","758"
"category|product_brand|user_gender","Outerwear & Coats|Diesel|M","0","0.0019083969465648854","0","758","758"
"category|product_brand|user_state","Outerwear & Coats|Diesel|Shanghai","0","0.0019083969465648854","0","758","758"
"category|product_brand|product_distribution_center_id","Outerwear & Coats|Diesel|10","0","0.0019083969465648854","0","758","758"
"category|user_gender|user_state","Outerwear & Coats|M|Shanghai","0","0.0019083969465648854","0","758","758"
"category|user_state|product_distribution_center_id","Outerwear & Coats|Shanghai|10","0","0.0019083969465648854","0","758","758"
"product_brand|user_gender|user_state","Diesel|M|Shanghai","0","0.0019083969465648854","0","758","758"
"product_brand|user_state|product_distribution_center_id","Diesel|Shanghai|10","0","0.0019083969465648854","0","758","758"
"category|product_brand|user_gender|user_state","Outerwear & Coats|Diesel|M|Shanghai","0","0.0019083969465648854","0","758","758"
"category|product_brand|user_gender|product_distribution_center_id","Outerwear & Coats|Diesel|M|10","0","0.0019083969465648854","0","758","758"
"category|product_brand|user_state|product_distribution_center_id","Outerwear & Coats|Diesel|Shanghai|10","0","0.0019083969465648854","0","758","758"
"category|user_gender|user_state|product_distribution_center_id","Outerwear & Coats|M|Shanghai|10","0","0.0019083969465648854","0","758","758"
"product_brand|user_gender|user_state|product_distribution_center_id","Diesel|M|Shanghai|10","0","0.0019083969465648854","0","758","758"
"category|product_brand|user_gender|user_state|product_distribution_center_id","Outerwear & Coats|Diesel|M|Shanghai|10","0","0.0019083969465648854","0","758","758"
"user_state","California","0.037109375","0.01717557251908397","1346.9600009918213","608.8300018310547","-738.1299991607666"
"user_gender|product_distribution_center_id","M|1","0.044921875","0.05534351145038168","933.5300006866455","1667.1299798488617","733.5999791622162"
"category|user_gender","Outerwear & Coats|M","0.033203125","0.03816793893129771","2518.0799865722656","3234.900011062622","716.8200244903564"
"category","Accessories","0.05078125","0.0648854961832061","745.719988822937","1460.7700026035309","715.0500137805939"
"product_brand","Barbour","0","0.003816793893129771","0","678","678"
"product_brand|user_gender","Barbour|M","0","0.003816793893129771","0","678","678"
"product_brand|product_distribution_center_id","Barbour|5","0","0.003816793893129771","0","678","678"
'''


class SummaryController(object):
    def __init__(self) -> None:
        pass

    def summary(self,
                # topDrivers: str,
                # topDriversByDimensions: dict[str, str],
                # baseVale: float,
                # comparisonValue: float,
                # metricName: str
                ) -> str:

        context = "You are a senior data analyst analyzing the insight of a metric movement. I will ask you questions and you will answer."
        message = "Hi, I have a problem with my account."
        prompt = f"Chat:\n{context}\nUser: {msg}\n"

        response = openai.ChatCompletion.create(
            model='gpt-4',
            messages=[
                {"role": "system", "content": "You are a intelligent assistant for data analytics experts."},
                {"role": "user", "content": msg}
            ],
            temperature=0,
        )

        reply = response.choices[0].message.content
        print(f"ChatGPT: {reply}")
        print(reply)

        return reply
