from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CompanyProfile
from .serializers import CompanyProfileSerializer


class CompanyProfileView(APIView):
    """
    Point d'entrée unique pour lire et mettre à jour le profil entreprise
    (singleton). Accepte du JSON ou du multipart (pour l'upload du logo).
    """

    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        profile = CompanyProfile.load()
        serializer = CompanyProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    def put(self, request):
        return self._update(request, partial=False)

    def patch(self, request):
        return self._update(request, partial=True)

    def _update(self, request, partial):
        profile = CompanyProfile.load()
        serializer = CompanyProfileSerializer(
            profile, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


from rest_framework import viewsets
from .models import Team, TeamMember
from .serializers import TeamSerializer, TeamMemberSerializer


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.prefetch_related("members").all()
    serializer_class = TeamSerializer
    search_fields = ["name"]


class TeamMemberViewSet(viewsets.ModelViewSet):
    queryset = TeamMember.objects.select_related("team").all()
    serializer_class = TeamMemberSerializer
    filterset_fields = ["team"]
